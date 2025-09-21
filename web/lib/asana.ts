import axios, { AxiosError, AxiosInstance } from "axios";
import prisma from "@/lib/prisma";

const ASANA_BASE_URL = process.env.ASANA_BASE_URL || "https://app.asana.com/api/1.0";
const ASANA_TOKEN = process.env.ASANA_TOKEN as string;
const ASANA_PROJECT_ID = process.env.ASANA_PROJECT_ID as string;
const ASANA_TEAM_ID = process.env.ASANA_TEAM_ID as string | undefined;
// ASANA_RATE_LIMIT controls max requests per minute. Default 1500 requests/minute.
// If the env is invalid or <= 0, we fall back to the default.
const ASANA_RATE_LIMIT = (() => {
  const raw = Number(process.env.ASANA_RATE_LIMIT ?? 1500);
  if (!Number.isFinite(raw) || raw <= 0) return 1500;
  return Math.floor(raw);
})();

// Compute milliseconds between request start times to keep under the minute limit
const MS_PER_MINUTE = 60 * 1000;
const msBetweenRequests = Math.max(0, Math.floor(MS_PER_MINUTE / ASANA_RATE_LIMIT));

// Simple serial rate limiter: chain requests so their start times are at least
// `msBetweenRequests` apart. This is intentionally simple (start-time spacing)
// and avoids adding dependencies. Retries will also be paced through this limiter.
let lastRequestStart = 0;
let rateChain: Promise<void> = Promise.resolve();

async function waitForRateTurn() {
  const scheduled = rateChain.then(async () => {
    const now = Date.now();
    const since = now - lastRequestStart;
    const wait = Math.max(0, msBetweenRequests - since);
    if (wait > 0) {
      console.log(`[asana] rate limiter: waiting ${wait}ms before next request`);
      await new Promise((r) => setTimeout(r, wait));
    }
    // Mark start time for spacing next request
    lastRequestStart = Date.now();
  });
  // Keep chain alive regardless of success/failure
  rateChain = scheduled.catch(() => {}).then(() => {});
  return scheduled;
}

if (!ASANA_TOKEN) {
  // We allow import without env in dev, actual sync will throw if missing
}

function createClient(): AxiosInstance {
  console.log(`[asana] creating axios client with base ${ASANA_BASE_URL}`);
  const client = axios.create({ baseURL: ASANA_BASE_URL, headers: { Authorization: `Bearer ${ASANA_TOKEN}` } });
  return client;
}

async function withBackoff<T>(fn: () => Promise<T>, attempt = 0): Promise<T> {
  try {
    // Ensure we don't exceed ASANA_RATE_LIMIT: wait for our turn before each
    // network attempt. This spaces start times of requests.
    await waitForRateTurn();
    return await fn();
  } catch (e) {
    const err = e as AxiosError;
    const status = err.response?.status;
    console.log(`[asana] request failed (status=${status}) attempt=${attempt}`);
    if (status === 429 && attempt < 5) {
      const retryAfter = Number(err.response?.headers?.["retry-after"]) || Math.min(2 ** attempt * 500, 5000);
      console.log(`[asana] rate limited, retrying after ${retryAfter}ms (attempt ${attempt + 1})`);
      await new Promise((r) => setTimeout(r, retryAfter));
      return withBackoff(fn, attempt + 1);
    }
    throw e;
  }
}

type AsanaUser = { gid: string; name?: string; email?: string };
type AsanaSection = { gid: string; name: string };
type AsanaTask = { gid: string; name?: string; due_on?: string | null; completed?: boolean; created_at?: string | null; memberships?: { section?: { gid?: string } }[] };
type AsanaSubtask = { gid: string; name?: string; completed?: boolean; created_at?: string | null; completed_at?: string | null; assignee?: AsanaUser | null; followers?: AsanaUser[]; due_on?: string | null };

export async function syncFromAsana() {
  if (!ASANA_PROJECT_ID) throw new Error("ASANA_PROJECT_ID is required");
  if (!ASANA_TOKEN) throw new Error("ASANA_TOKEN is required");
  console.log(`[asana] starting sync for project ${ASANA_PROJECT_ID}`);
  const client = createClient();

  // Destructive sync: clear tables in an order that respects FKs
  console.log('[asana] clearing existing data (task_followers, subtasks, tasks, sections)');
  await prisma.$transaction([
    prisma.task_followers.deleteMany(),
    prisma.subtasks.deleteMany(),
    prisma.tasks.deleteMany(),
    prisma.sections.deleteMany(),
  ]);

  // Optionally refresh assignees from team (unchanged behavior)
  if (ASANA_TEAM_ID) {
    console.log(`[asana] fetching team users for team ${ASANA_TEAM_ID}`);
    const teamUsers: AsanaUser[] = await paginate<AsanaUser>(client, `/teams/${ASANA_TEAM_ID}/users`, { params: { opt_fields: "email,name" } });
    // Upsert to avoid breaking references
    for (const u of teamUsers) {
      const [firstname = "", lastname = ""] = (u.name ?? "").split(" ");
      await prisma.assignees.upsert({
        where: { email: u.email ?? `${u.gid}@asana.local` },
        update: { assignee_gid: u.gid, firstname, lastname },
        create: { email: u.email ?? `${u.gid}@asana.local`, assignee_gid: u.gid, firstname, lastname },
      });
    }
  }

  // Table-by-table sync approach:
  // 1) Fetch all sections and bulk insert
  // 2) Fetch all tasks for the project (project tasks endpoint) and bulk insert
  // 3) Fetch all subtasks for all tasks, build follower links, and bulk insert subtasks and followers

  // 1) Sections
  console.log('[asana] fetching sections');
  const sections: AsanaSection[] = await paginate<AsanaSection>(client, `/projects/${ASANA_PROJECT_ID}/sections`);
  console.log(`[asana] fetched ${sections.length} sections`);
  if (sections.length > 0) {
    const data = sections.map((s) => ({ gid: s.gid, name: s.name }));
    console.log(`[asana] inserting ${data.length} sections`);
    await prisma.sections.createMany({ data, skipDuplicates: true });
  }

  // 2) Tasks for the project. Use the project tasks endpoint to avoid per-section fetching.
  // Include minimal fields we need.
  console.log('[asana] fetching tasks for project');
  const tasks: AsanaTask[] = await paginate<AsanaTask>(client, `/projects/${ASANA_PROJECT_ID}/tasks`, { params: { opt_fields: "name,due_on,completed,created_at,memberships.section" } });
  console.log(`[asana] fetched ${tasks.length} tasks`);

  // Prepare tasks for bulk insert, map section membership if present
  const taskRows = tasks.map((t) => {
    // memberships can include section info; try to find the section gid
    const memberships = (t as unknown as { memberships?: { section?: { gid?: string } }[] }).memberships;
    const section_gid = memberships && memberships.length ? memberships[0].section?.gid ?? null : null;
    return {
      gid: t.gid,
      name: t.name ?? null,
      section_gid,
      completed: t.completed ?? null,
      due_on: t.due_on ? new Date(t.due_on) : null,
      created_at: t.created_at ? new Date(t.created_at) : null,
      project: ASANA_PROJECT_ID,
    };
  });

  if (taskRows.length > 0) {
    // Insert in chunks to avoid large single queries
    const chunkSize = 500;
    for (let i = 0; i < taskRows.length; i += chunkSize) {
      const chunk = taskRows.slice(i, i + chunkSize);
      console.log(`[asana] inserting tasks chunk ${i}-${i + chunk.length}`);
      await prisma.tasks.createMany({ data: chunk, skipDuplicates: true });
    }
  }

  // 3) Subtasks and followers: fetch subtasks for all tasks and bulk insert
  const allSubtasks: Array<{ sub: AsanaSubtask; parentTaskGid: string }> = [];
  for (const t of tasks) {
    console.log(`[asana] fetching subtasks for task ${t.gid}`);
    const subs: AsanaSubtask[] = await paginate<AsanaSubtask>(client, `/tasks/${t.gid}/subtasks`, { params: { opt_fields: "name,completed,created_at,completed_at,assignee,followers,due_on" } });
    for (const st of subs) {
      allSubtasks.push({ sub: st, parentTaskGid: t.gid });
    }
  }
  console.log(`[asana] total subtasks fetched: ${allSubtasks.length}`);

  // Build subtask rows and follower rows
  type SubtaskRow = {
    gid: string;
      name: string | null;
      parent_task_gid: string;
      assignee_gid: string | null;
      completed: boolean | null;
      created_at: Date | null;
      completed_at: Date | null;
      due_on: Date | null;
  };

  const subtaskRows: SubtaskRow[] = [];
  const followerRows: Array<{ task_gid: string; follower_gid: string }> = [];

  // Cache existing assignee gids to avoid repeated DB hits
  const existingAssignees = new Set<string>();
  const assigneesList = await prisma.assignees.findMany({ select: { assignee_gid: true } });
  for (const a of assigneesList) if (a.assignee_gid) existingAssignees.add(a.assignee_gid);

  for (const { sub: st, parentTaskGid } of allSubtasks) {
    let assigneeToSet: string | null = null;
    if (st.assignee?.gid && existingAssignees.has(st.assignee.gid)) {
      assigneeToSet = st.assignee.gid;
    }

    subtaskRows.push({
      gid: st.gid,
      name: st.name ?? null,
      parent_task_gid: parentTaskGid,
      assignee_gid: assigneeToSet,
      completed: st.completed ?? null,
      created_at: st.created_at ? new Date(st.created_at) : null,
      completed_at: st.completed_at ? new Date(st.completed_at) : null,
      due_on: st.due_on ? new Date(st.due_on) : null,
    });

    if (st.followers?.length) {
      const followerGids = new Set<string>();
      for (const f of st.followers) {
        if (!f.gid) continue;
        if (f.gid === assigneeToSet) continue;
        if (!existingAssignees.has(f.gid)) continue;
        followerGids.add(f.gid);
      }
      for (const gid of followerGids) followerRows.push({ task_gid: st.gid, follower_gid: gid });
    }
  }

  // Bulk insert subtasks and followers in chunks
  const insertInChunks = async <T>(rows: T[], modelCreateMany: (opts: { data: T[]; skipDuplicates?: boolean }) => Promise<unknown>) => {
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      console.log(`[asana] inserting chunk ${i}-${i + chunk.length} into db`);
      await modelCreateMany({ data: chunk, skipDuplicates: true });
    }
  };

  if (subtaskRows.length > 0) {
    console.log(`[asana] inserting ${subtaskRows.length} subtasks`);
    await insertInChunks(subtaskRows, prisma.subtasks.createMany.bind(prisma.subtasks));
  }

  if (followerRows.length > 0) {
    console.log(`[asana] inserting ${followerRows.length} follower links`);
    await insertInChunks(followerRows, prisma.task_followers.createMany.bind(prisma.task_followers));
  }

  await prisma.sync_metadata.upsert({
    where: { key: "asana_sync" },
    update: { updated_at: new Date(), message: "OK" },
    create: { key: "asana_sync", updated_at: new Date(), message: "OK" },
  });

  return { sections: sections.length, tasks: tasks.length, subtasks: subtaskRows.length };
}

async function paginate<T>(client: AxiosInstance, path: string, opts?: { params?: Record<string, unknown> }): Promise<T[]> {
  const out: T[] = [];
  let url = path;
  while (url) {
    const res = await withBackoff(() => client.get(url, { params: opts?.params }));
    const data = (res.data?.data ?? []) as T[];
    out.push(...data);
    const next = res.data?.next_page?.uri as string | undefined;
    if (next) {
      // Asana returns absolute URL
      const u = new URL(next);
      url = `${u.pathname}${u.search}`;
    } else {
      url = "";
    }
  }
  return out;
}
