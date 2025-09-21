import axios, { AxiosError, AxiosInstance } from "axios";
import prisma from "@/lib/prisma";

const ASANA_BASE_URL = process.env.ASANA_BASE_URL || "https://app.asana.com/api/1.0";
const ASANA_TOKEN = process.env.ASANA_TOKEN as string;
const ASANA_PROJECT_ID = process.env.ASANA_PROJECT_ID as string;
const ASANA_TEAM_ID = process.env.ASANA_TEAM_ID as string | undefined;

if (!ASANA_TOKEN) {
  // We allow import without env in dev, actual sync will throw if missing
}

function createClient(): AxiosInstance {
  const client = axios.create({ baseURL: ASANA_BASE_URL, headers: { Authorization: `Bearer ${ASANA_TOKEN}` } });
  return client;
}

async function withBackoff<T>(fn: () => Promise<T>, attempt = 0): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const err = e as AxiosError;
    const status = err.response?.status;
    if (status === 429 && attempt < 5) {
      const retryAfter = Number(err.response?.headers?.["retry-after"]) || Math.min(2 ** attempt * 500, 5000);
      await new Promise((r) => setTimeout(r, retryAfter));
      return withBackoff(fn, attempt + 1);
    }
    throw e;
  }
}

type AsanaUser = { gid: string; name?: string; email?: string };
type AsanaSection = { gid: string; name: string };
type AsanaTask = { gid: string; name?: string; due_on?: string | null; completed?: boolean; created_at?: string | null };
type AsanaSubtask = { gid: string; name?: string; completed?: boolean; created_at?: string | null; completed_at?: string | null; assignee?: AsanaUser | null; followers?: AsanaUser[] };

export async function syncFromAsana() {
  if (!ASANA_PROJECT_ID) throw new Error("ASANA_PROJECT_ID is required");
  if (!ASANA_TOKEN) throw new Error("ASANA_TOKEN is required");
  const client = createClient();

  // Destructive sync
  await prisma.$transaction([
    prisma.task_followers.deleteMany(),
    prisma.subtasks.deleteMany(),
    prisma.tasks.deleteMany(),
    prisma.sections.deleteMany(),
  ]);

  // Optionally refresh assignees from team
  if (ASANA_TEAM_ID) {
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

  // Sections of the project
  const sections: AsanaSection[] = await paginate<AsanaSection>(client, `/projects/${ASANA_PROJECT_ID}/sections`);
  for (const s of sections) {
    await prisma.sections.create({ data: { gid: s.gid, name: s.name } });
    // Tasks under section
    const tasks: AsanaTask[] = await paginate<AsanaTask>(client, `/sections/${s.gid}/tasks`, { params: { opt_fields: "name,due_on,completed,created_at" } });
    for (const t of tasks) {
      await prisma.tasks.create({
        data: {
          gid: t.gid,
          name: t.name ?? null,
          section_gid: s.gid,
          completed: t.completed ?? null,
          due_on: t.due_on ? new Date(t.due_on) : null,
          created_at: t.created_at ? new Date(t.created_at) : null,
          project: ASANA_PROJECT_ID,
        },
      });

      // Subtasks with assignee and followers
      const subs: AsanaSubtask[] = await paginate<AsanaSubtask>(client, `/tasks/${t.gid}/subtasks`, { params: { opt_fields: "name,completed,created_at,completed_at,assignee,followers" } });
      for (const st of subs) {
        await prisma.subtasks.create({
          data: {
            gid: st.gid,
            name: st.name ?? null,
            parent_task_gid: t.gid,
            assignee_gid: st.assignee?.gid ?? null,
            completed: st.completed ?? null,
            created_at: st.created_at ? new Date(st.created_at) : null,
            completed_at: st.completed_at ? new Date(st.completed_at) : null,
          },
        });
        if (st.followers?.length) {
          for (const f of st.followers) {
            await prisma.task_followers.create({ data: { task_gid: st.gid, follower_gid: f.gid } });
          }
        }
      }
    }
  }

  await prisma.sync_metadata.upsert({
    where: { key: "asana_sync" },
    update: { updated_at: new Date(), message: "OK" },
    create: { key: "asana_sync", updated_at: new Date(), message: "OK" },
  });

  return { sections: sections.length };
}

async function paginate<T>(client: AxiosInstance, path: string, opts?: { params?: Record<string, any> }): Promise<T[]> {
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
