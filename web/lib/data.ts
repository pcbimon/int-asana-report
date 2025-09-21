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
    select: { gid: true, name: true, due_on: true, completed: true },
    orderBy: { created_at: "asc" },
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
        label: t.name ?? "",
        assigned: 0,
        completed: 0,
        overdue: 0,
        collab: 0,
        expected,
        due_on: t.due_on ?? null,
        completedFlag: !!t.completed,
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

  const result: WeeklyPoint[] = [];
  for (const [gid, v] of byTask) {
    if (v.assigned + v.collab + v.completed + v.overdue === 0) continue; // skip empty
    result.push({ week: v.label, assigned: v.assigned, completed: v.completed, overdue: v.overdue, collab: v.collab, expected: v.expected });
  }
  return result;
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
        tasks: { select: { gid: true, name: true, due_on: true } },
      },
    }),
    prisma.task_followers.findMany({
      where: { follower_gid: assigneeGid },
      select: { task_gid: true },
    }),
  ]);

  const followerTaskIds = new Set(followerLinks.map((f) => f.task_gid));
  const followedSubtasks = await prisma.subtasks.findMany({
    where: { gid: { in: Array.from(followerTaskIds) } },
    select: { gid: true, name: true, assignee_gid: true, completed: true, created_at: true, tasks: { select: { gid: true, name: true, due_on: true } } },
  });

  // Build rows
  const allRows: CurrentTaskRow[] = [];

  const pushRow = (st: typeof owned[number], type: CurrentTaskRow["type"]) => {
    const statusStr = computeStatus({ completed: st.completed ?? false, due_on: st.tasks?.due_on ?? null });
    allRows.push({
      gid: st.gid,
      name: st.name ?? "",
      week: st.tasks?.name ?? "",
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

  // Sort: due date desc, then status order Completed, Overdue, Pending
  const statusRank: Record<CurrentTaskRow["status"], number> = {
    Completed: 0,
    Overdue: 1,
    Pending: 2,
  };
  filtered.sort((a, b) => {
    const dueA = a.due_on?.getTime() ?? 0;
    const dueB = b.due_on?.getTime() ?? 0;
    if (dueA !== dueB) return dueB - dueA;
    return statusRank[a.status] - statusRank[b.status];
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);
  return { rows, total, pageSize };
}
