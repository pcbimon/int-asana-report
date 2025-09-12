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
  SyncMetadata
} from '@/models/asanaReport';
import { Database } from '../../database.types';


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
  };
}

/**
 * Convert database rows to model objects
 */
function rowToAssignee(row: AssigneeRow): Assignee {
  if (!row.name) {
    throw new Error(`Assignee with gid ${row.gid} has null name`);
  }
  return {
    gid: row.gid,
    name: row.name,
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
  return {
    gid: row.gid,
    name: row.name,
    section_gid: row.section_gid,
    assignee: assignee,
    completed: row.completed,
    completed_at: row.completed_at || undefined,
    due_on: row.due_on || undefined,
    project: row.project || undefined,
    created_at: row.created_at || undefined,
    subtasks: [], // Will be populated later
  };
}

function rowToSubtask(row: SubtaskRow, assignee?: Assignee): Subtask {
  return {
    gid: row.gid,
    name: row.name,
    parent_task_gid: row.parent_task_gid,
    assignee: assignee,
    completed: row.completed,
    created_at: row.created_at || undefined,
    completed_at: row.completed_at || undefined,
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
    report.getAllAssignees().forEach(assignee => {
      assigneeMap.set(assignee.gid, assignee);
    });
    console.log(`Collected ${assigneeMap.size} unique assignees.`);
    // Prepare data for upsert
    const assigneeRows: AssigneeRow[] = Array.from(assigneeMap.values()).map(assigneeToRow);
    const sectionRows: SectionRow[] = report.sections.map(sectionToRow);
    const taskRows: TaskRow[] = [];
    const subtaskRows: SubtaskRow[] = [];
    
    // Flatten tasks and subtasks
    report.sections.forEach(section => {
      section.tasks.forEach(task => {
        taskRows.push(taskToRow(task));
        
        task.subtasks?.forEach(subtask => {
          subtaskRows.push(subtaskToRow(subtask));
        });
      });
    });
    
    console.log(
      `Preparing to upsert: ${assigneeRows.length} assignees, ` +
      `${sectionRows.length} sections, ${taskRows.length} tasks, ` +
      `${subtaskRows.length} subtasks`
    );
    
    // Execute upserts in sequence (could be parallelized for better performance)
    
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
export async function loadReport(): Promise<AsanaReport> {
  try {
    console.log('Starting loadReport operation...');
    const startTime = Date.now();
    
    // Load all data in parallel
    const [
      { data: assigneeData, error: assigneeError },
      { data: sectionData, error: sectionError },
      { data: taskData, error: taskError },
      { data: subtaskData, error: subtaskError },
    ] = await Promise.all([
      getSupabaseClient().from('assignees').select('*'),
      getSupabaseClient().from('sections').select('*'),
      getSupabaseClient().from('tasks').select('*'),
      getSupabaseClient().from('subtasks').select('*'),
    ]);
    
    // Check for errors
    if (assigneeError) throw new Error(`Failed to load assignees: ${assigneeError.message}`);
    if (sectionError) throw new Error(`Failed to load sections: ${sectionError.message}`);
    if (taskError) throw new Error(`Failed to load tasks: ${taskError.message}`);
    if (subtaskError) throw new Error(`Failed to load subtasks: ${subtaskError.message}`);
    
    console.log(
      `Loaded from database: ${assigneeData?.length || 0} assignees, ` +
      `${sectionData?.length || 0} sections, ${taskData?.length || 0} tasks, ` +
      `${subtaskData?.length || 0} subtasks`
    );
    
    // Create assignee lookup map
    const assigneeMap = new Map<string, Assignee>();
    (assigneeData || []).forEach(row => {
      const assignee = rowToAssignee(row as AssigneeRow);
      assigneeMap.set(assignee.gid, assignee);
    });
    // Create subtask lookup map by parent task
    const subtasksByTask = new Map<string, Subtask[]>();
    (subtaskData || []).forEach(row => {
      const subtaskRow = row as SubtaskRow;
      const assignee = subtaskRow.assignee_gid ? assigneeMap.get(subtaskRow.assignee_gid) : undefined;
      const subtask = rowToSubtask(subtaskRow, assignee);
      
      if (!subtasksByTask.has(subtask.parent_task_gid || '')) {
        subtasksByTask.set(subtask.parent_task_gid || '', []);
      }
      subtasksByTask.get(subtask.parent_task_gid || '')!.push(subtask);
    });
    console.log('Subtasks mapped to parent tasks.');
    // Create task lookup map by section
    const tasksBySection = new Map<string, Task[]>();
    (taskData || []).forEach(row => {
      const taskRow = row as TaskRow;
      const assignee = taskRow.assignee_gid ? assigneeMap.get(taskRow.assignee_gid) : undefined;
      const task = rowToTask(taskRow, assignee);
      
      // Attach subtasks to task
      task.subtasks = subtasksByTask.get(task.gid) || [];
      
      if (!tasksBySection.has(task.section_gid || '')) {
        tasksBySection.set(task.section_gid || '', []);
      }
      tasksBySection.get(task.section_gid || '')!.push(task);
    });
    
    // Build sections with tasks
    const sections: Section[] = (sectionData || []).map(row => {
      const section = rowToSection(row as SectionRow);
      section.tasks = tasksBySection.get(section.gid) || [];
      return section;
    });
    const duration = Date.now() - startTime;
    console.log(`loadReport completed in ${duration}ms`);
    console.log(`Total unique assignees in report: ${assigneeMap.size}`);
    return new AsanaReport(sections);
    
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
      .upsert(metadata as any, { onConflict: 'key' });
    
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
    
    return (data as any)?.role || null;
    
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
    
    return (data as any)?.assignee_gid || null;
    
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