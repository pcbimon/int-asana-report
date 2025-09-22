import prisma from "@/lib/prisma";
import type { StatusFilter, WeeklyPoint, CurrentTaskRow } from "@/lib/types";

export async function getAssignees() {
  return prisma.assignees.findMany({
    where: { assignee_gid: { not: null } },
    select: { assignee_gid: true, firstname: true, lastname: true, email: true },
    orderBy: [{ firstname: "asc" }, { lastname: "asc" }],
  });
}

export async function getLastSync() {
  const row = await prisma.sync_metadata.findUnique({ where: { key: "asana_sync" } });
  return row?.updated_at ?? null;
}

export async function getAssigneeByGid(assigneeGid: string) {
  const a = await prisma.assignees.findFirst({ where: { assignee_gid: assigneeGid }, select: { firstname: true, lastname: true, email: true } });
  if (!a) return null;
  const name = `${a.firstname ?? ""} ${a.lastname ?? ""}`.trim();
  return { name, email: a.email };
}

// Helper to compute status from booleans and dates
function computeStatus(params: { completed?: boolean | null; due_on?: Date | null }): "Pending" | "Completed" | "Overdue" {
  const { completed, due_on } = params;
  if (completed) return "Completed";
  if (due_on && new Date(due_on) < new Date()) return "Overdue";
  return "Pending";
}

export async function getSummaryMetrics(assigneeGid: string) {
  // Count subtasks where the user is assignee OR follower
  const [asAssignee, asFollower] = await Promise.all([
    prisma.subtasks.count({ where: { assignee_gid: assigneeGid } }),
    prisma.task_followers.count({ where: { assignees: { assignee_gid: assigneeGid } } }),
  ]);

  // Completed subtasks (owned or followed)
  const [completedOwned, completedFollow] = await Promise.all([
    prisma.subtasks.count({ where: { assignee_gid: assigneeGid, completed: true } }),
    prisma.task_followers.count({ where: { follower_gid: assigneeGid, subtasks: { completed: true } } }),
  ]);

  const total = asAssignee + asFollower;
  const completed = completedOwned + completedFollow;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Overdue: parent task due_on < today and subtask not completed
  const overdueOwned = await prisma.subtasks.count({
    where: {
      assignee_gid: assigneeGid,
      completed: false,
      tasks: { due_on: { lt: new Date(new Date().toDateString()) } },
    },
  });
  const overdueFollow = await prisma.task_followers.count({
    where: {
      follower_gid: assigneeGid,
      subtasks: { completed: false, tasks: { due_on: { lt: new Date(new Date().toDateString()) } } },
    },
  });

  return { total, completed, overdue: overdueOwned + overdueFollow, completionRate };
}

export async function getWeeklySummary(assigneeGid: string): Promise<WeeklyPoint[]> {
  // Group by parent task (which encodes the week) and count subtasks
  const tasks = await prisma.tasks.findMany({
    select: { gid: true, name: true, due_on: true, completed: true, week_startdate: true },
    orderBy: { week_startdate: "asc" },
  });

  const expected = Number(process.env.REPORT_EXPECTED_TASKS_PER_WEEK ?? 3);

  // For performance, fetch subtasks once
  const subtasks = await prisma.subtasks.findMany({
    select: { gid: true, parent_task_gid: true, assignee_gid: true, completed: true },
  });
  const followerLinks = await prisma.task_followers.findMany({ select: { task_gid: true, follower_gid: true } });
  const followersBySubtask = new Map<string, Set<string>>();
  for (const f of followerLinks) {
    if (!followersBySubtask.has(f.task_gid)) followersBySubtask.set(f.task_gid, new Set());
    followersBySubtask.get(f.task_gid)!.add(f.follower_gid);
  }

  const byTask = new Map(
    tasks.map((t) => [
      t.gid,
      {
        // Prefer week_startdate (if present) formatted for display, otherwise fall back to task name
        label: t.week_startdate ? new Date(t.week_startdate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : t.name ?? "",
        assigned: 0,
        completed: 0,
        overdue: 0,
        collab: 0,
        expected,
        due_on: t.due_on ?? null,
        completedFlag: !!t.completed,
        _week_startdate: t.week_startdate
      },
    ])
  );

  const today = new Date();

  for (const st of subtasks) {
    const bucket = byTask.get(st.parent_task_gid ?? "");
    if (!bucket) continue;
    const isOwner = st.assignee_gid === assigneeGid;
    const isFollower = followersBySubtask.get(st.gid)?.has(assigneeGid) ?? false;
    if (isOwner) bucket.assigned += 1;
    if (isFollower) bucket.collab += 1;
    if ((isOwner || isFollower) && st.completed) bucket.completed += 1;
    if ((isOwner || isFollower) && !st.completed) {
      if (bucket.due_on && bucket.due_on < today) bucket.overdue += 1;
    }
  }

  const result: (WeeklyPoint & { _week_startdate?: string | null })[] = [];
  for (const [gid, v] of byTask) {
    if (v.assigned + v.collab + v.completed + v.overdue === 0) continue; // skip empty
    result.push({ week: v.label, assigned: v.assigned, completed: v.completed, overdue: v.overdue, collab: v.collab, expected: v.expected, _week_startdate: v._week_startdate ? new Date(v._week_startdate).toISOString() : null });
  }

  // Clean up internal sort key before returning
  return result.map(({ _week_startdate, ...rest }) => rest as WeeklyPoint);
}

export async function getCurrentTasks(
  assigneeGid: string,
  opts: { status?: StatusFilter; page?: number; pageSize?: number } = {}
) {
  const { status = "all", page = 1, pageSize = 10 } = opts;

  // Get subtasks where this user is owner or follower
  const [owned, followerLinks] = await Promise.all([
    prisma.subtasks.findMany({
      where: { assignee_gid: assigneeGid },
      select: {
        gid: true,
        name: true,
        assignee_gid: true,
        completed: true,
        created_at: true,
        tasks: { select: { gid: true, name: true, due_on: true, week_startdate: true } },
      },
      orderBy: { tasks: { week_startdate: "desc" } },
    }),
    prisma.task_followers.findMany({
      where: { follower_gid: assigneeGid },
      select: {
        subtasks: {
          select: {
            gid: true,
            name: true,
            assignee_gid: true,
            completed: true,
            created_at: true,
            tasks: { select: { gid: true, name: true, due_on: true, week_startdate: true } },
          },
        },
      },
      orderBy: { subtasks: { tasks: { week_startdate: "desc" } } },
    }),
  ]);

  // Normalize follower links to the same shape as `owned`
  const followedSubtasks = followerLinks.flatMap((f) => (f.subtasks ? [f.subtasks] : [])) as typeof owned;

  // Build rows
  const allRows: CurrentTaskRow[] = [];

  const pushRow = (st: typeof owned[number], type: CurrentTaskRow["type"]) => {
    const statusStr = computeStatus({ completed: st.completed ?? false, due_on: st.tasks?.due_on ?? null });
    allRows.push({
      gid: st.gid,
      name: st.name ?? "",
      week: st.tasks?.week_startdate ? new Date(st.tasks.week_startdate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : st.tasks?.name ?? "",
      created_at: st.created_at ?? null,
      due_on: st.tasks?.due_on ?? null,
      status: statusStr,
      type,
    });
  };

  owned.forEach((st) => pushRow(st, "Owner"));
  followedSubtasks.forEach((st) => pushRow(st, "Collaborator"));

  // Filter by status
  const filtered = allRows.filter((r) =>
    status === "all" ? true : r.status.toLowerCase() === status
  );
  // Sort: status order Completed, Overdue, Pending
  const statusRank: Record<CurrentTaskRow["status"], number> = {
    Completed: 0,
    Overdue: 1,
    Pending: 2,
  };

  // Instead of doing pagination in-memory, perform DB-level pagination.
  // We'll compute total count from filtered rows and then fetch a page using
  // offset/limit. To do that efficiently we need minimal fields from DB and
  // then map to the same shape.
  // Build where clauses for owner and follower
  const ownerWhere = { assignee_gid: assigneeGid };
  const followerWhere = { task_followers: { some: { follower_gid: assigneeGid } } };

  // Build base where depending on status filter
  const statusFilterWhere: any = {};
  if (status !== "all") {
    if (status === "completed") {
      statusFilterWhere.completed = true;
    } else if (status === "pending") {
      statusFilterWhere.completed = false;
    } else if (status === "overdue") {
      // overdue = parent task due_on < today AND subtask not completed
      statusFilterWhere.completed = false;
      statusFilterWhere.tasks = { due_on: { lt: new Date(new Date().toDateString()) } };
    }
  }

  // Total count of matching subtasks where user is owner or follower
  const total = await prisma.subtasks.count({
    where: {
      OR: [{ AND: [ownerWhere, statusFilterWhere] }, { AND: [followerWhere, statusFilterWhere] }],
    },
  });

  // Fetch paginated rows from DB. We'll fetch subtasks with related task data.
  const start = (page - 1) * pageSize;
  const dbRows = await prisma.subtasks.findMany({
    where: {
      OR: [ownerWhere, followerWhere],
    },
    select: {
      gid: true,
      name: true,
      assignee_gid: true,
      completed: true,
      created_at: true,
      due_on: true,
      tasks: { select: { gid: true, name: true, due_on: true, week_startdate: true } },
      task_followers: { select: { follower_gid: true } },
    },
    // Order by parent task week_startdate (desc) first, then by completion (completed first).
    // To approximate Overdue before Pending within incomplete tasks, order by tasks.due_on asc
    // so past dates (overdue) come before future dates. This gives a nested sort coming
    // from the DB and avoids needing an in-memory status sort.
    orderBy: [
      { tasks: { week_startdate: "desc" } },
      { completed: "desc" },
      { tasks: { due_on: "asc" } },
    ],
    skip: start,
    take: pageSize,
  });

  // Map DB rows to CurrentTaskRow[] and apply status filter (since complex overdue logic
  // combining tasks.due_on and completed is easier in JS for formatting consistency)
  const mapped: CurrentTaskRow[] = dbRows.map((st) => {
    const isFollower = (st.task_followers ?? []).some((f) => f.follower_gid === assigneeGid);
    const type: CurrentTaskRow['type'] = st.assignee_gid === assigneeGid ? 'Owner' : isFollower ? 'Collaborator' : 'Owner';
    const statusStr = computeStatus({ completed: st.completed ?? false, due_on: st.tasks?.due_on ?? null });
    return {
      gid: st.gid,
      name: st.name ?? "",
      week: st.tasks?.week_startdate ? new Date(st.tasks.week_startdate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : st.tasks?.name ?? "",
      created_at: st.created_at ?? null,
      due_on: st.tasks?.due_on ?? null,
      status: statusStr,
      type,
    };
  }).filter((r) => (status === 'all' ? true : r.status.toLowerCase() === status));


  return { rows: mapped, total, pageSize };
}
