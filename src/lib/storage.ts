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
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
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

    // Load sections with nested tasks and subtasks (single query)
    // We use PostgREST nested selects to fetch tasks and subtasks and include assignee references
    // Note: aliasing used to avoid name collisions: task_assignee and subtask_assignee
    // Projection: select only required columns to reduce payload size
    // sections: gid, name
    // tasks: gid, name, section_gid, assignee_gid, completed, completed_at, due_on, project, created_at
    // task assignee: gid, name, email
    // subtasks: gid, name, parent_task_gid, assignee_gid, completed, created_at, completed_at
    // subtask assignee: gid, name, email
    // Build select string. When filtering by assignee, we still request the same
    // projection but we'll add a filter clause below to limit subtasks by assignee_gid.
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

    // Execute query. If an assigneeGid is provided, add a PostgREST filter to the
    // nested `subtasks` relationship: tasks.subtasks.assignee_gid=eq.{assigneeGid}
    // PostgREST supports filtering on relationships by appending the path in the
    // query string; with supabase-js we can use the `select` string and then
    // call `.filter` on the client. However, the simpler approach is to use a
    // raw RPC-like query via the view: we'll attach the filter using the
    // PostgREST `select` with embedded filter syntax for the nested relation.

    // Build the final select with an inline filter on subtasks when needed.
    const finalSelect = selectString;

    const { data: nestedSections, error: nestedError } = await getSupabaseClient()
      .from('sections')
      .select(finalSelect);

    if (nestedError) {
      throw new Error(`Failed to load nested sections: ${nestedError.message}`);
    }

    if (!nestedSections) {
      console.log("No sections found in database.");
      return new AsanaReport([]);
    }

    // Map nested result into models
    const sections: Section[] = (nestedSections).map((sectionRow) => {
      const section = rowToSection({
        gid: sectionRow.gid,
        name: sectionRow.name,
      } as SectionRow);

      const tasksRaw = sectionRow.tasks || [];
      section.tasks = tasksRaw.map((t) => {
        // t.assignee may be null or an array depending on PostgREST; normalize
        const taskAssigneeRow = t.assignee_gid != null ? t.assignee : null;
        const taskAssignee = taskAssigneeRow
          ? rowToAssignee(taskAssigneeRow as AssigneeRow)
          : undefined;

        const task: Task = rowToTask(
          {
            gid: t.gid,
            name: t.name,
            section_gid: t.section_gid,
            assignee_gid: taskAssignee ? taskAssignee.gid : null,
            completed: t.completed,
            completed_at: t.completed_at || null,
            due_on: t.due_on || null,
            project: t.project || null,
            created_at: t.created_at || null,
          } as TaskRow,
          taskAssignee
        );

        let subtasksRaw = t.subtasks || [];
        // If an assigneeGid was supplied, filter subtasks server-side result
        // to only include those assigned to the given assignee. We perform
        // this filtering here to avoid returning unrelated rows.
        if (assigneeGid) {
          // Include subtasks where the provided assigneeGid is either the subtask assignee
          // or is present in the followers list (follower-only subtasks should be visible)
          subtasksRaw = subtasksRaw.filter((s) => {
            if (s.assignee_gid === assigneeGid) return true;
            const followers = s.followers || [];
            return followers.some((f: any) => f && f.assignee_gid === assigneeGid);
          });
        }

        task.subtasks = subtasksRaw.map((s) => {
          const subAssigneeRow = s.assignee_gid != null ? s.assignee : null;
          const subAssignee = subAssigneeRow
            ? rowToAssignee(subAssigneeRow as AssigneeRow)
            : undefined;
          const followersRaw = s.followers || [];

          return rowToSubtask(
            {
              gid: s.gid,
              name: s.name,
              parent_task_gid: s.parent_task_gid,
              assignee_gid: subAssignee ? subAssignee.gid : null,
              completed: s.completed,
              created_at: s.created_at || null,
              completed_at: s.completed_at || null,
              due_on: s.due_on || null,
            } as SubtaskRow,
            subAssignee,
            followersRaw.map((f) => rowToAssignee(f.assignee as AssigneeRow))
          );
        });

        return task;
      })
        // If assigneeGid was provided, drop tasks that have no subtasks for that assignee
        .filter((task: Task) => {
          if (!assigneeGid) return true;
          return (task.subtasks && task.subtasks.length > 0) || false;
        });

      return section;
    });
    // If filtering by assignee, drop sections that have no tasks for that assignee
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
    return {
      key: row.key,
      lastUpdated: row.updated_at,
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
export async function getUserRole(uid: string): Promise<string | null> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('user_roles')
      .select('role')
      .eq('uid', uid)
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
 * Get assignee associated with user
 */
export async function getUserAssignee(uid: string): Promise<string | null> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('user_assignees')
      .select('assignee_gid')
      .eq('uid', uid)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get user assignee: ${error.message}`);
    }

    return (data)?.assignee_gid || null;

  } catch (error) {
    console.error('Error getting user assignee:', error);
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