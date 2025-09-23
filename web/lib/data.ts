import prisma from "@/lib/prisma";
import dayjs from "dayjs";
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
  // Use subtasks as the primary source and join to parent tasks for week_startdate/due_on
  const expected = Number(process.env.REPORT_EXPECTED_TASKS_PER_WEEK ?? 3);

  // Fetch subtasks where the user is owner OR a follower, include parent task info and followers
  const subtaskRows = await prisma.subtasks.findMany({
    where: {
      OR: [
        { assignee_gid: assigneeGid },
        { task_followers: { some: { follower_gid: assigneeGid } } },
      ],
    },
    select: {
      gid: true,
      assignee_gid: true,
      completed: true,
      due_on: true,
      tasks: { select: { gid: true, name: true, week_startdate: true, due_on: true } },
  task_followers: { select: { follower_gid: true, assignees: { select: { firstname: true, lastname: true } } } },
    },
    orderBy: { tasks: { week_startdate: "asc" } },
  });

  // Aggregate counts keyed by week_startdate string (or task name fallback)
  type Agg = { label: string; assigned: number; completed: number; overdue: number; collab: number; expected: number; _ws?: string | null };
  const byWeek = new Map<string, Agg>();

  for (const st of subtaskRows) {
    const isOwner = st.assignee_gid === assigneeGid;
    const isFollower = (st.task_followers ?? []).some((f) => f.follower_gid === assigneeGid);
    if (!isOwner && !isFollower) continue;

    const weekKeyRaw = st.tasks?.week_startdate ?? st.tasks?.name ?? "No Week";
    const weekKey = weekKeyRaw ? new Date(weekKeyRaw).toISOString() : "No Week";
    const label = st.tasks?.week_startdate ? dayjs(st.tasks.week_startdate).format("DD MMM YYYY") : st.tasks?.name ?? "No Week";

    if (!byWeek.has(weekKey)) {
      byWeek.set(weekKey, { label, assigned: 0, completed: 0, overdue: 0, collab: 0, expected, _ws: st.tasks?.week_startdate ? new Date(st.tasks.week_startdate).toISOString() : null });
    }

    const agg = byWeek.get(weekKey)!;
    if (isOwner) agg.assigned += 1;
    if (isFollower) agg.collab += 1;
    if ((isOwner || isFollower) && st.completed) agg.completed += 1;
    if ((isOwner || isFollower) && !st.completed) {
      const dueRaw = st.due_on;
      if (dueRaw) {
        const dueDate = new Date(dueRaw);
        const cutoff = new Date(new Date().toDateString()); // midnight today
        if (dueDate < cutoff) agg.overdue += 1;
      }
    }
  }

  type ExtendedPoint = WeeklyPoint & { _ws?: string | null };
  const result: ExtendedPoint[] = [];
  for (const [, v] of byWeek) {
    if (v.assigned + v.collab + v.completed + v.overdue === 0) continue;
  result.push({ week: v.label, assigned: v.assigned, completed: v.completed, overdue: v.overdue, collab: v.collab, expected: v.expected, _ws: v._ws ? new Date(v._ws).toISOString() : null });
  }

  // Sort by _week_startdate ascending (nulls go last)
  result.sort((a, b) => {
  const aDate = a._ws ? new Date(a._ws) : null;
  const bDate = b._ws ? new Date(b._ws) : null;
    if (aDate && bDate) return aDate.getTime() - bDate.getTime();
    if (aDate) return -1;
    if (bDate) return 1;
    return 0;
  });

  // Remove internal sort key before returning
  return result.map((p) => {
    const { _ws, ...rest } = p;
    void _ws; // omit internal field without triggering unused-var
    return rest as WeeklyPoint;
  });
}

export async function getCurrentTasks(
  assigneeGid: string,
  opts: { status?: StatusFilter; page?: number; pageSize?: number } = {}
) {
  const { status = "all", page = 1, pageSize = 10 } = opts;
  // Instead of doing pagination in-memory, perform DB-level pagination.
  // We'll compute total count from filtered rows and then fetch a page using
  // offset/limit. To do that efficiently we need minimal fields from DB and
  // then map to the same shape.
  // Build where clauses for owner and follower
  const ownerWhere = { assignee_gid: assigneeGid };
  const followerWhere = { task_followers: { some: { follower_gid: assigneeGid } } };

  // Build base where depending on status filter
  const statusFilterWhere: { completed?: boolean; tasks?: { due_on?: { lt: Date } } } = {};
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

  // Total count of matching subtasks where user is owner or follower.
  // Note: apply the statusFilterWhere to both owner and follower branches so
  // collaborator items are counted when filtering by status (e.g. overdue).
  const total = await prisma.subtasks.count({
    where: {
      OR: [
        { AND: [ownerWhere, statusFilterWhere] },
        { AND: [followerWhere, statusFilterWhere] },
      ],
    },
  });

  // Fetch paginated rows from DB. We'll fetch subtasks with related task data.
  const start = (page - 1) * pageSize;
  // When fetching rows, include the same status filter so DB pagination and
  // ordering only return matching rows. We need to merge the owner/follower
  // clauses with the statusFilterWhere appropriately.
  const dbWhere: {
    OR: Array<{ AND: Array<Record<string, unknown>> }>;
  } = {
    OR: [
      { AND: [ownerWhere, statusFilterWhere] },
      { AND: [followerWhere, statusFilterWhere] },
    ],
  };

  const dbRows = await prisma.subtasks.findMany({
    where: dbWhere,
    select: {
      gid: true,
      name: true,
      assignee_gid: true,
      completed: true,
      created_at: true,
      due_on: true,
      tasks: { select: { gid: true, name: true, due_on: true, week_startdate: true } },
      task_followers: { select: { follower_gid: true, assignees: { select: { firstname: true, lastname: true } } } },
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
    const followers = (st.task_followers ?? []).map((f) => {
      const a = f.assignees;
      return { gid: f.follower_gid, first_name: a?.firstname ?? "", last_name: a?.lastname ?? "" };
    });
    const isFollower = followers.some((f) => f.gid === assigneeGid);
    const type: CurrentTaskRow['type'] = st.assignee_gid === assigneeGid ? 'Owner' : isFollower ? 'Collaborator' : 'Owner';
    // Compute status: prefer subtask.due_on but fall back to parent task due_on
    const effectiveDue = st.due_on ?? st.tasks?.due_on ?? null;
    const statusStr = computeStatus({ completed: st.completed ?? false, due_on: effectiveDue });
    return {
      gid: st.gid,
      name: st.name ?? "",
      week: st.tasks?.week_startdate ? dayjs(st.tasks.week_startdate).format("DD MMM YYYY") : null,
      created_at: st.created_at ? dayjs(st.created_at).format("DD MMM YYYY") : null,
      due_on: st.due_on ? dayjs(st.due_on).format("DD MMM YYYY") : null,
      status: statusStr,
      type,
      followers,
    };
  }).filter((r) => (status === 'all' ? true : r.status.toLowerCase() === status));


  return { rows: mapped, total, pageSize };
}

