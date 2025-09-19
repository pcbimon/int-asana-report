/**
 * Supabase storage functions for Asana Report Dashboard
 * Implements "1 Class Model = 1 Table" approach with sync metadata tracking
 * All operations use server-side Supabase client with service role key
 */

import { createClient } from '@supabase/supabase-js';
import {
  AsanaReport,
  Section,
  Task,
  Subtask,
  Assignee,
  SyncMetadata,
  Follower
} from '@/models/asanaReport';
import { Database } from '../../database.types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);


function getSupabaseClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!);
}

/**
 * Database row interfaces matching the schema
 */
interface AssigneeRow {
  gid: string;
  name: string | null;
  email: string | null;
}

interface SectionRow {
  gid: string;
  name: string | null;
}

interface TaskRow {
  gid: string;
  name: string;
  section_gid: string;
  assignee_gid: string | null;
  completed: boolean;
  completed_at: string | null;
  due_on: string | null;
  project: string | null;
  created_at: string | null;
}

interface SubtaskRow {
  gid: string;
  name: string;
  parent_task_gid: string;
  assignee_gid: string | null;
  completed: boolean;
  created_at: string | null;
  completed_at: string | null;
  due_on: string | null;
}
interface FollowerRow {
  assignee_gid: string;
  subtask_gid: string;
}
interface SyncMetadataRow {
  key: string;
  updated_at: string;
  status: string;
  message: string | null;
  record_count: number | null;
}

interface DepartmentRow {
  departmentid: string;
  name_en?: string | null;
}


/**
 * Convert model objects to database rows
 */
function assigneeToRow(assignee: Assignee): AssigneeRow {
  return {
    gid: assignee.gid,
    name: assignee.name,
    email: assignee.email || null,
  };
}

function sectionToRow(section: Section): SectionRow {
  return {
    gid: section.gid,
    name: section.name,
  };
}

function taskToRow(task: Task): TaskRow {
  return {
    gid: task.gid,
    name: task.name,
    section_gid: task.section_gid || '',
    assignee_gid: task.assignee?.gid || null,
    completed: task.completed,
    completed_at: task.completed_at || null,
    due_on: task.due_on || null,
    project: task.project || null,
    created_at: task.created_at || null,
  };
}

function subtaskToRow(subtask: Subtask): SubtaskRow {
  return {
    gid: subtask.gid,
    name: subtask.name,
    parent_task_gid: subtask.parent_task_gid || '',
    assignee_gid: subtask.assignee?.gid || null,
    completed: subtask.completed,
    created_at: subtask.created_at || null,
    completed_at: subtask.completed_at || null,
    due_on: subtask.due_on || null,
  };
}
function followerToRow(follower: Follower): FollowerRow {
  return {
    subtask_gid: follower.subtask_gid,
    assignee_gid: follower.assignee_gid,
  };
}
/**
 * Convert database rows to model objects
 */
function rowToAssignee(row: AssigneeRow): Assignee {
  // Be tolerant of missing name: prefer name, fallback to email local-part or gid
  const nameFallback = row.name || (row.email ? row.email.split('@')[0] : row.gid);
  return {
    gid: row.gid,
    name: nameFallback,
    email: row.email || undefined,
  };
}

function rowToSection(row: SectionRow): Section {
  if (!row.name) {
    throw new Error(`Section with gid ${row.gid} has null name`);
  }
  return {
    gid: row.gid,
    name: row.name,
    tasks: [], // Will be populated later
  };
}

function rowToTask(row: TaskRow, assignee?: Assignee): Task {
  // Convert UTC timestamps to Asia/Bangkok (ICT) preserving ISO offset +07:00
  const conv = (iso?: string | null) => {
    if (!iso) return undefined;
    try {
      return dayjs.utc(iso).tz('Asia/Bangkok').format();
    } catch {
      return iso as string;
    }
  };

  return {
    gid: row.gid,
    name: row.name,
    section_gid: row.section_gid,
    assignee: assignee,
    completed: row.completed,
    completed_at: conv(row.completed_at) || undefined,
    due_on: row.due_on || undefined,
    project: row.project || undefined,
    created_at: conv(row.created_at) || undefined,
    subtasks: [], // Will be populated later
  };
}

function rowToSubtask(row: SubtaskRow, assignee?: Assignee, followers?: Assignee[]): Subtask {
  const conv = (iso?: string | null) => {
    if (!iso) return undefined;
    try {
      return dayjs.utc(iso).tz('Asia/Bangkok').format();
    } catch {
      return iso as string;
    }
  };

  return {
    gid: row.gid,
    name: row.name,
    parent_task_gid: row.parent_task_gid,
    assignee: assignee,
    followers: followers || [],
    completed: row.completed,
    created_at: conv(row.created_at) || undefined,
    completed_at: conv(row.completed_at) || undefined,
    due_on: row.due_on || undefined,
  };
}
/**
 * Save complete AsanaReport to Supabase with upsert operations
 */
export async function saveReport(
  report: AsanaReport,
  metadataKey: string = 'asana_sync'
): Promise<{ success: boolean; message: string; recordCount: number }> {
  try {
    console.log('Starting saveReport operation...');
    const startTime = Date.now();

    // Collect all unique assignees
    const assigneeMap = new Map<string, Assignee>();
    report.teamMembers.forEach(assignee => {
      assigneeMap.set(assignee.gid, assignee);
    });
    console.log(`Collected ${assigneeMap.size} unique assignees.`);
    // Prepare data for upsert
    const assigneeRows: AssigneeRow[] = Array.from(assigneeMap.values()).map(assigneeToRow);
    const sectionRows: SectionRow[] = report.sections.map(sectionToRow);
    const taskRows: TaskRow[] = [];
    const subtaskRows: SubtaskRow[] = [];
    const followerRows: FollowerRow[] = [];

    // Flatten tasks and subtasks
    report.sections.forEach(section => {
      section.tasks.forEach(task => {
        taskRows.push(taskToRow(task));

        task.subtasks?.forEach(subtask => {
          subtaskRows.push(subtaskToRow(subtask));
          subtask.followers?.forEach(follower => {
            followerRows.push(followerToRow({ subtask_gid: subtask.gid, assignee_gid: follower.gid }));
          });
        });
      });
    });

    console.log(
      `Preparing to upsert: ${assigneeRows.length} assignees, ` +
      `${sectionRows.length} sections, ${taskRows.length} tasks, ` +
      `${subtaskRows.length} subtasks`
    );

    // Execute upserts in sequence (could be parallelized for better performance)
    // First Clear existing data to avoid conflicts
    await getSupabaseClient().from('followers').delete().neq('subtask_gid', '');
    await getSupabaseClient().from('subtasks').delete().neq('gid', '');
    await getSupabaseClient().from('tasks').delete().neq('gid', '');
    await getSupabaseClient().from('sections').delete().neq('gid', '');
    await getSupabaseClient().from('assignees').delete().neq('gid', '');
    console.log('Cleared existing data from tables.');
    // 1. Upsert assignees
    if (assigneeRows.length > 0) {
      const { error: assigneeError } = await getSupabaseClient()
        .from('assignees')
        .upsert(assigneeRows, { onConflict: 'gid' });

      if (assigneeError) {
        throw new Error(`Failed to upsert assignees: ${assigneeError.message}`);
      }
    }

    // 2. Upsert sections
    if (sectionRows.length > 0) {
      const { error: sectionError } = await getSupabaseClient()
        .from('sections')
        .upsert(sectionRows, { onConflict: 'gid' });

      if (sectionError) {
        throw new Error(`Failed to upsert sections: ${sectionError.message}`);
      }
    }

    // 3. Upsert tasks
    if (taskRows.length > 0) {
      const { error: taskError } = await getSupabaseClient()
        .from('tasks')
        .upsert(taskRows, { onConflict: 'gid' });

      if (taskError) {
        throw new Error(`Failed to upsert tasks: ${taskError.message}`);
      }
    }

    // 4. Upsert subtasks
    if (subtaskRows.length > 0) {
      const { error: subtaskError } = await getSupabaseClient()
        .from('subtasks')
        .upsert(subtaskRows, { onConflict: 'gid' });

      if (subtaskError) {
        throw new Error(`Failed to upsert subtasks: ${subtaskError.message}`);
      }
    }
    // 4a. Upsert followers
    if (followerRows.length > 0) {
      const { error: followerError } = await getSupabaseClient()
        .from('followers')
        .upsert(followerRows, { onConflict: 'subtask_gid,assignee_gid' });
      if (followerError) {
        throw new Error(`Failed to upsert followers: ${followerError.message}`);
      }
    }

    // 5. Update sync metadata
    const totalRecords = assigneeRows.length + sectionRows.length + taskRows.length + subtaskRows.length;
    await setLastUpdated(metadataKey, 'success', 'Sync completed successfully', totalRecords);

    const duration = Date.now() - startTime;
    console.log(`saveReport completed in ${duration}ms. Total records: ${totalRecords}`);

    return {
      success: true,
      message: 'Report saved successfully',
      recordCount: totalRecords,
    };

  } catch (error) {
    console.error('Error in saveReport:', error);

    // Update sync metadata with error status
    try {
      await setLastUpdated(metadataKey, 'error', error instanceof Error ? error.message : 'Unknown error');
    } catch (metaError) {
      console.error('Failed to update sync metadata:', metaError);
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      recordCount: 0,
    };
  }
}

/**
 * Load complete AsanaReport from Supabase with proper relationships
 */
/**
 * Load complete AsanaReport from Supabase with proper relationships.
 * If `assigneeGid` is provided, only subtasks assigned to that assignee
 * (and their parent tasks/sections) will be returned. This reduces payload
 * and avoids processing unrelated rows on the server.
 */
export async function loadReport(assigneeGid?: string): Promise<AsanaReport> {
  try {
    console.log("Starting loadReport operation...");
    const startTime = Date.now();

    const selectString = `
    gid,name,
    tasks(
      gid,name,section_gid,assignee_gid,completed,completed_at,due_on,project,created_at,
      assignee:assignees!tasks_assignee_gid_fkey(gid,name,email),
      subtasks(
        gid,name,parent_task_gid,assignee_gid,completed,created_at,completed_at,due_on,
        assignee:assignees!subtasks_assignee_gid_fkey(gid,name,email),
        followers(
          assignee_gid,
          assignee:assignees!followers_assignee_gid_fkey(gid,name,email)
        )
      )
    )`;

    // Define typed shapes for the two response modes
    type RpcRow = {
      subtask_gid: string;
      subtask_name?: string | null;
      parent_task_gid?: string | null;
      task_gid?: string | null;
      task_name?: string | null;
      section_gid?: string | null;
      section_name?: string | null;
      subtask_assignee_gid?: string | null;
      subtask_assignee_name?: string | null;
      subtask_assignee_email?: string | null;
      followers?: unknown;
      completed?: boolean;
      created_at?: string | null;
      completed_at?: string | null;
      due_on?: string | null;
    };

    interface FollowerRaw { assignee_gid?: string | null; assignee?: AssigneeRow | null }
    interface SubtaskRaw {
      gid: string;
      name: string;
      parent_task_gid?: string | null;
      assignee_gid?: string | null;
      completed?: boolean;
      created_at?: string | null;
      completed_at?: string | null;
      due_on?: string | null;
      assignee?: AssigneeRow | null;
      followers?: FollowerRaw[];
    }
    interface TaskRaw {
      gid: string;
      name: string;
      section_gid?: string | null;
      assignee_gid?: string | null;
      completed?: boolean;
      completed_at?: string | null;
      due_on?: string | null;
      project?: string | null;
      created_at?: string | null;
      assignee?: AssigneeRow | null;
      subtasks?: SubtaskRaw[];
    }
    interface SectionNestedRow { gid: string; name: string | null; tasks?: TaskRaw[] }

    let nestedSections: RpcRow[] | SectionNestedRow[] | null = null;
    let nestedError: unknown = null;

    const parseFollowerAssignee = (f: unknown): Assignee | null => {
      if (!f || typeof f !== 'object') return null;
      const o = f as FollowerRaw;
      if (o.assignee) return rowToAssignee(o.assignee as AssigneeRow);
      if (o.assignee_gid) return { gid: o.assignee_gid, name: o.assignee_gid, email: undefined };
      return null;
    };

    if (assigneeGid) {
      // RPC row shape (informal) — we'll cast the rpc result to this shape
      type RpcRow = {
        subtask_gid: string;
        subtask_name?: string | null;
        parent_task_gid?: string | null;
        task_gid?: string | null;
        task_name?: string | null;
        section_gid?: string | null;
        section_name?: string | null;
        subtask_assignee_gid?: string | null;
        subtask_assignee_name?: string | null;
        subtask_assignee_email?: string | null;
        followers?: unknown;
        completed?: boolean;
        created_at?: string | null;
        completed_at?: string | null;
        due_on?: string | null;
      };

      type RpcClient = { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error?: unknown }> };
      const rpcRes = await (getSupabaseClient() as unknown as RpcClient).rpc('get_subtasks_by_assignee', { p_assignee_gid: assigneeGid });
      nestedSections = rpcRes?.data as RpcRow[] | null;
      nestedError = rpcRes?.error;
    } else {
      const res = await getSupabaseClient().from('sections').select(selectString);
      nestedSections = res.data as SectionNestedRow[] | null;
      nestedError = res.error;
    }

    if (nestedError) {
      const errObj = nestedError as { message?: unknown } | null;
      const errMsg = errObj && typeof errObj.message === 'string' ? errObj.message : String(nestedError);
      throw new Error(`Failed to load nested sections: ${errMsg}`);
    }
    if (!nestedSections) return new AsanaReport([]);

    // Map nested result into models
    let sections: Section[] = [];
    if (assigneeGid) {
      // Materialize sections/tasks/subtasks from flat RPC rows
      const rows = nestedSections as RpcRow[];
      const sectionMap = new Map<string, Section>();
      const taskMap = new Map<string, Task>();

      for (const r of rows) {
        const secGid = r.section_gid || '__no_section__';
        if (!sectionMap.has(secGid)) {
          sectionMap.set(secGid, rowToSection({ gid: secGid, name: r.section_name || 'No Section' } as SectionRow));
        }
        const section = sectionMap.get(secGid)!;

        const taskGid = r.task_gid || (`__task_for_${r.parent_task_gid || r.subtask_gid}`);
        let task = taskMap.get(taskGid);
        if (!task) {
          task = rowToTask({ gid: taskGid, name: r.task_name || 'No Task', section_gid: secGid, assignee_gid: null, completed: false, completed_at: null, due_on: null, project: null, created_at: null } as TaskRow, undefined);
          taskMap.set(taskGid, task);
          section.tasks.push(task);
        }

        const subAssignee = r.subtask_assignee_gid ? rowToAssignee({ gid: r.subtask_assignee_gid, name: r.subtask_assignee_name || null, email: r.subtask_assignee_email || null } as AssigneeRow) : undefined;
        const followersRaw = Array.isArray(r.followers) ? (r.followers as unknown[]) : [];
        const followers = followersRaw.map(parseFollowerAssignee).filter((x): x is Assignee => x !== null);

        const subtask = rowToSubtask({ gid: r.subtask_gid, name: r.subtask_name || '', parent_task_gid: r.parent_task_gid || task.gid, assignee_gid: r.subtask_assignee_gid || null, completed: r.completed || false, created_at: r.created_at || null, completed_at: r.completed_at || null, due_on: r.due_on || null } as SubtaskRow, subAssignee, followers);
        task.subtasks = task.subtasks || [];
        task.subtasks.push(subtask);
      }

      sections = Array.from(sectionMap.values());
    } else {
      // Map the nested sections result returned by PostgREST
      const nested = (nestedSections || []) as SectionNestedRow[];
      sections = nested.map((sectionRow) => {
        const section = rowToSection({ gid: sectionRow.gid, name: sectionRow.name } as SectionRow);
        const tasksRaw = sectionRow.tasks || [] as TaskRaw[];
        section.tasks = tasksRaw.map((t: TaskRaw) => {
          const taskAssigneeRow = t.assignee_gid != null ? t.assignee : null;
          const taskAssignee = taskAssigneeRow ? rowToAssignee(taskAssigneeRow as AssigneeRow) : undefined;
          const task = rowToTask({ gid: t.gid, name: t.name, section_gid: t.section_gid || '', assignee_gid: taskAssignee ? taskAssignee.gid : null, completed: !!t.completed, completed_at: t.completed_at || null, due_on: t.due_on || null, project: t.project || null, created_at: t.created_at || null } as TaskRow, taskAssignee);

          let subtasksRaw = t.subtasks || [] as SubtaskRaw[];
          if (assigneeGid) {
            subtasksRaw = subtasksRaw.filter((s: SubtaskRaw) => {
              if (s.assignee_gid === assigneeGid) return true;
              const followers = s.followers || [];
              return followers.some((f) => !!f && f.assignee_gid === assigneeGid);
            });
          }

          task.subtasks = subtasksRaw.map((s: SubtaskRaw) => {
            const subAssigneeRow = s.assignee_gid != null ? s.assignee : null;
            const subAssignee = subAssigneeRow ? rowToAssignee(subAssigneeRow as AssigneeRow) : undefined;
            const followersRaw = s.followers || [];
            const followers = followersRaw.map(parseFollowerAssignee).filter((x): x is Assignee => x !== null);
            return rowToSubtask({ gid: s.gid, name: s.name, parent_task_gid: s.parent_task_gid || '', assignee_gid: subAssignee ? subAssignee.gid : null, completed: !!s.completed, created_at: s.created_at || null, completed_at: s.completed_at || null, due_on: s.due_on || null } as SubtaskRow, subAssignee, followers);
          });

          return task;
        })
          .filter((task: Task) => {
            if (!assigneeGid) return true;
            return !!(task.subtasks && task.subtasks.length > 0);
          });

        return section;
      });
    }

    const filteredSections = assigneeGid ? sections.filter(sec => (sec.tasks && sec.tasks.length > 0)) : sections;

    const duration = Date.now() - startTime;
    console.log(`loadReport completed in ${duration}ms`);
    return new AsanaReport(filteredSections);
  } catch (error) {
    console.error('Error in loadReport:', error);
    throw error;
  }
}

/**
 * Get last sync timestamp and status
 */
export async function getLastUpdated(key: string = 'asana_sync'): Promise<SyncMetadata | null> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('sync_metadata')
      .select('*')
      .eq('key', key)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to get sync metadata: ${error.message}`);
    }

    if (!data) return null;

    const row = data as SyncMetadataRow;
    // Convert updated_at (stored as UTC ISO) to Asia/Bangkok timezone string
    let converted: string | undefined = undefined;
    try {
      converted = dayjs.utc(row.updated_at).tz('Asia/Bangkok').format();
    } catch {
      converted = row.updated_at;
    }

    return {
      key: row.key,
      lastUpdated: converted,
      status: row.status as 'success' | 'error' | 'in-progress',
      message: row.message || undefined,
      recordCount: row.record_count || undefined,
    };

  } catch (error) {
    console.error('Error getting sync metadata:', error);
    return null;
  }
}

/**
 * Set last sync timestamp and status
 */
export async function setLastUpdated(
  key: string = 'asana_sync',
  status: 'success' | 'error' | 'in-progress' = 'success',
  message?: string,
  recordCount?: number
): Promise<void> {
  try {
    const metadata: SyncMetadataRow = {
      key,
      updated_at: new Date().toISOString(),
      status,
      message: message || null,
      record_count: recordCount || null,
    };

    const { error } = await getSupabaseClient()
      .from('sync_metadata')
      .upsert(metadata, { onConflict: 'key' });

    if (error) {
      throw new Error(`Failed to update sync metadata: ${error.message}`);
    }

  } catch (error) {
    console.error('Error setting sync metadata:', error);
    throw error;
  }
}

/**
 * Check if database has any data
 */
export async function hasData(): Promise<boolean> {
  try {
    const { count, error } = await getSupabaseClient()
      .from('subtasks')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error checking for data:', error);
      return false;
    }

    return (count || 0) > 0;

  } catch (error) {
    console.error('Error checking for data:', error);
    return false;
  }
}

/**
 * Get user role from database
 */
// NOTE: user_roles table now uses `user_email` (string) as the lookup column.
// This function accepts a user email and returns the role string if present.
export async function getUserRole(userEmail: string): Promise<string | null> {
  try {
    if (!userEmail) return null;
    const { data, error } = await getSupabaseClient()
      .from('user_roles')
      .select('role')
      .eq('user_email', userEmail)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get user role: ${error.message}`);
    }

    return (data)?.role || null;

  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

/**
 * Get assignee GID associated with a user email.
 *
 * Previously this used a `user_assignees` mapping keyed by auth `uid`.
 * To simplify access checks we now resolve an assignee by matching the
 * `assignees.email` column. If no matching assignee is found, `null` is
 * returned.
 */
export async function getUserAssignee(userEmail: string): Promise<string | null> {
  try {
    if (!userEmail) return null;

    // Look up the assignee by email in the `assignees` table
    const { data, error } = await getSupabaseClient()
      .from('assignees')
      .select('gid')
      .eq('email', userEmail)
      .single();

    // PGRST116 = no rows returned
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get user assignee by email: ${error.message}`);
    }

    return (data)?.gid || null;

  } catch (error) {
    console.error('Error getting user assignee by email:', error);
    return null;
  }
}

/**
 * Get all assignees (for admin users)
 */
export async function getAllAssigneesFromDB(): Promise<Assignee[]> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('assignees')
      .select('*')
      .order('name');

    if (error) {
      throw new Error(`Failed to get assignees: ${error.message}`);
    }

    return (data || []).map(rowToAssignee);

  } catch (error) {
    console.error('Error getting assignees:', error);
    return [];
  }
}

/**
 * Clear all data from database (useful for testing or full resync)
 */
export async function clearAllData(): Promise<void> {
  try {
    console.log('Clearing all data from database...');

    // Delete in reverse dependency order
    await Promise.all([
      getSupabaseClient().from('subtasks').delete().neq('gid', ''),
      getSupabaseClient().from('tasks').delete().neq('gid', ''),
      getSupabaseClient().from('sections').delete().neq('gid', ''),
      getSupabaseClient().from('assignees').delete().neq('gid', ''),
    ]);

    console.log('All data cleared from database');

  } catch (error) {
    console.error('Error clearing data:', error);
    throw error;
  }
}

/**
 * Get departments with grouped assignees for admin UI
 */
export async function getDepartmentsWithAssignees(): Promise<{ departmentId: string; name_en: string; assignee: Assignee[] }[]> {
  try {
    // Batch approach: fetch departments, all mappings for those departments,
    // then fetch all referenced assignees and userinfo in two batched queries.
    const { data: deps, error: depsErr } = await getSupabaseClient()
      .from('departments')
      .select('*')
      .order('departmentid');

    if (depsErr) {
      throw new Error(`Failed to load departments: ${depsErr.message}`);
    }

  const deptList = (deps || []) as DepartmentRow[];
  if (deptList.length === 0) return [];

  const deptIds = deptList.map((d) => d.departmentid).filter(Boolean) as string[];

    // Fetch all mappings for these departments in one call
    const { data: allMappings, error: mappingsErr } = await getSupabaseClient()
      .from('assignee_department')
      .select('assignee_email, departmentid')
      .in('departmentid', deptIds);

    if (mappingsErr) {
      throw new Error(`Failed to load assignee_department mappings: ${mappingsErr.message}`);
    }

  const mappingRows = (allMappings || []) as { assignee_email?: string; departmentid?: string }[];
  const uniqueEmails = Array.from(new Set(mappingRows.map((m) => m.assignee_email).filter(Boolean))) as string[];

    // Pre-fetch assignees and userinfo in bulk (if we have any emails)
    let assigneesRows: AssigneeRow[] = [];
    let infoRows: { assignee_email: string; firstname?: string; lastname?: string; nickname?: string }[] = [];

    if (uniqueEmails.length > 0) {
      const [{ data: aRows, error: aErr }, { data: iRows, error: iErr }] = await Promise.all([
        getSupabaseClient()
          .from('assignees')
          .select('gid, name, email')
          .in('email', uniqueEmails),
        getSupabaseClient()
          .from('assignee_userinfo')
          .select('assignee_email, firstname, lastname, nickname')
          .in('assignee_email', uniqueEmails),
      ]);

      if (!aRows && aErr) {
        console.error('Failed to load assignees in batch:', aErr);
      } else if (aRows) {
        assigneesRows = aRows as AssigneeRow[];
      }
      if (!iRows && iErr) {
        console.error('Failed to load assignee_userinfo in batch:', iErr);
      } else if (iRows) {
        infoRows = iRows as { assignee_email: string; firstname?: string; lastname?: string; nickname?: string }[];
      }
    }

    // Build quick lookup maps by email
    const assigneeByEmail = new Map<string, AssigneeRow>();
    for (const a of assigneesRows) if (a.email) assigneeByEmail.set(a.email, a);

  const infoByEmail = new Map<string, { assignee_email: string; firstname?: string; lastname?: string; nickname?: string }>();
  for (const i of infoRows) if (i.assignee_email) infoByEmail.set(i.assignee_email, i);

    // Group mapping emails by department
    const emailsByDept = new Map<string, string[]>();
    for (const m of mappingRows) {
      if (!m || !m.departmentid) continue;
      const email = m.assignee_email;
      if (!email) continue;
      if (!emailsByDept.has(m.departmentid)) emailsByDept.set(m.departmentid, []);
      emailsByDept.get(m.departmentid)!.push(email);
    }

    const out: { departmentId: string; name_en: string; assignee: Assignee[] }[] = [];

    for (const d of deptList) {
      const emails = emailsByDept.get(d.departmentid) || [];
      const assignees: Assignee[] = emails.map((assigneeEmail: string) => {
        const aRow = assigneeByEmail.get(assigneeEmail);
        const info = infoByEmail.get(assigneeEmail);

        // Build display name as "firstname(nickname)" when available
        let displayName = '';
        if (info && info.firstname) {
          displayName = info.firstname;
          if (info.nickname) displayName += `(${info.nickname})`;
        }

        if (aRow && aRow.gid) {
          return {
            gid: aRow.gid,
            name: displayName || (aRow.name || aRow.email || aRow.gid),
            email: aRow.email || undefined,
          } as Assignee;
        }

        // Fallback placeholder when there's no `assignees` row
        return {
          gid: assigneeEmail,
          name: displayName || assigneeEmail.split('@')[0],
          email: assigneeEmail,
        } as Assignee;
      });

  out.push({ departmentId: d.departmentid, name_en: d.name_en || '', assignee: assignees });
    }

    return out;
  } catch (error) {
    console.error('Error getting departments with assignees:', error);
    return [];
  }
}

