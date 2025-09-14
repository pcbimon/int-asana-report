/**
 * Data processor for Asana Report Dashboard
 * Implements subtask-centric approach for all metrics calculation
 * All aggregations and timeseries are computed from subtasks only
 */

import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import utc from 'dayjs/plugin/utc';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isBetween from 'dayjs/plugin/isBetween';
import { 
  AsanaReport, 
  Section, // eslint-disable-line @typescript-eslint/no-unused-vars
  Task, // eslint-disable-line @typescript-eslint/no-unused-vars
  Subtask, 
  Assignee, // eslint-disable-line @typescript-eslint/no-unused-vars
  AssigneeMetrics, 
  WeeklyData, 
  FilterOptions,
  ExportData 
} from '@/models/asanaReport';

// Enable dayjs plugins
dayjs.extend(isoWeek);
dayjs.extend(utc);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

/**
 * Normalize all timestamps to UTC ISO format
 */
function normalizeTimestamp(timestamp?: string): string | null {
  if (!timestamp) return null;
  return dayjs(timestamp).utc().toISOString();
}

/**
 * Get ISO week string from date (YYYY-Www format)
 */
function getISOWeek(dateString: string): string {
  const d = dayjs(dateString).utc();
  return `${d.year()}-W${String(d.isoWeek()).padStart(2, '0')}`;
}

/**
 * Get week start date (Monday) from ISO week string
 */
function getWeekStart(weekString: string): string {
  const [year, week] = weekString.split('-W');
  return dayjs().utc().year(parseInt(year)).isoWeek(parseInt(week)).startOf('isoWeek').toISOString();
}

/**
 * Check if a subtask is overdue
 */
function isSubtaskOverdue(subtask: Subtask): boolean {
  if (!subtask.due_on || subtask.completed) return false;
  
  const today = dayjs().utc().startOf('day');
  const dueDate = dayjs(subtask.due_on).utc().startOf('day');
  
  return dueDate.isBefore(today);
}

/**
 * Calculate lead time in days between created and completed
 */
function calculateLeadTime(createdAt?: string, completedAt?: string): number | null {
  if (!createdAt || !completedAt) return null;
  
  const created = dayjs(createdAt).utc();
  const completed = dayjs(completedAt).utc();
  
  return completed.diff(created, 'day', true); // Allow fractional days
}

/**
 * Generate weekly timeseries data for a range of weeks
 * Fills in missing weeks with zero values
 */
function generateWeeklyTimeseries(
  subtasks: Subtask[],
  collabSubtasks?: Subtask[],
  startWeek?: string,
  endWeek?: string
): WeeklyData[] {
  // Map keys are ISO week strings in format YYYY-Www (e.g. 2025-W37)
  const weeklyMap = new Map<string, { assigned: number; completed: number; overdue: number; collab: number }>();
  // Process subtasks for assigned and completed counts
  subtasks.forEach(subtask => {
    // Count assigned (created) subtasks
    if (subtask.created_at) {
      const isoWeekKey = getISOWeek(subtask.created_at);
         if (!weeklyMap.has(isoWeekKey)) {
           weeklyMap.set(isoWeekKey, { assigned: 0, completed: 0, overdue: 0, collab: 0 });
         }
      weeklyMap.get(isoWeekKey)!.assigned++;
    }

    // Count completed subtasks
    if (subtask.completed_at) {
      const isoWeekKey = getISOWeek(subtask.completed_at);
         if (!weeklyMap.has(isoWeekKey)) {
           weeklyMap.set(isoWeekKey, { assigned: 0, completed: 0, overdue: 0, collab: 0 });
         }
      weeklyMap.get(isoWeekKey)!.completed++;
    }

    // Count overdue subtasks by the week of due_on (only if currently overdue and not completed)
    if (subtask.due_on && !subtask.completed && isSubtaskOverdue(subtask)) {
      const isoWeekKey = getISOWeek(subtask.due_on);
      if (!weeklyMap.has(isoWeekKey)) {
        weeklyMap.set(isoWeekKey, { assigned: 0, completed: 0, overdue: 0, collab: 0 });
      }
      weeklyMap.get(isoWeekKey)!.overdue++;
    }
  });

  // Process collab (follower) subtasks - count them by created_at week
  (collabSubtasks || []).forEach(subtask => {
    if (subtask.created_at) {
      const isoWeekKey = getISOWeek(subtask.created_at);
      if (!weeklyMap.has(isoWeekKey)) {
        weeklyMap.set(isoWeekKey, { assigned: 0, completed: 0, overdue: 0, collab: 0 });
      }
      weeklyMap.get(isoWeekKey)!.collab++;
    }
  });
  // Determine date range - default to 52 weeks from last year to current week
  let start = startWeek;
  let end = endWeek;

  if (!start || !end) {
    const now = dayjs().utc();
    end = `${now.year()}-W${String(now.isoWeek()).padStart(2, '0')}`;
    const startDate = now.subtract(52, 'week');
    start = `${startDate.year()}-W${String(startDate.isoWeek()).padStart(2, '0')}`;
  }

  // Generate complete range with zeros for missing weeks
  const result: WeeklyData[] = [];
  let current = dayjs(getWeekStart(start));
  const endDate = dayjs(getWeekStart(end));

  while (current.isSameOrBefore(endDate)) {
    const isoWeekKey = getISOWeek(current.toISOString());
    const weekData = weeklyMap.get(isoWeekKey) || { assigned: 0, completed: 0, overdue: 0, collab: 0 };

    result.push({
      // week should be YYYY-Www
      week: isoWeekKey,
      // weekStart should be the ISO timestamp of the start of the week (Monday)
      weekStart: current.toISOString(),
      assigned: weekData.assigned,
      completed: weekData.completed,
      overdue: weekData.overdue,
      collab: weekData.collab,
    });

    current = current.add(1, 'week');
  }

  return result;
}

/**
 * Process AsanaReport and calculate metrics for all assignees
 * Core function that implements subtask-centric approach
 */
export function processAsanaReport(report: AsanaReport): AssigneeMetrics[] {
  console.log('Processing Asana report with subtask-centric approach...');
  
  const assigneeMetricsMap = new Map<string, AssigneeMetrics>();
  
  // Get all unique assignees
  const allAssignees = report.getAllAssignees();
  
  // Initialize metrics for each assignee
  allAssignees.forEach(assignee => {
    assigneeMetricsMap.set(assignee.gid, {
      assignee,
      total: 0,
      completed: 0,
      overdue: 0,
      completionRate: 0,
      avgTime: 0,
      weeklyTimeseries: [],
    });
  });
  
  // Collect all subtasks by assignee (assigned) and by follower (collab)
  const subtasksByAssignee = new Map<string, Subtask[]>();
  const collabSubtasksByAssignee = new Map<string, Subtask[]>();

  report.sections.forEach(section => {
    section.tasks.forEach(task => {
      // Normalize timestamps for all subtasks
      task.subtasks?.forEach(subtask => {
        subtask.created_at = normalizeTimestamp(subtask.created_at) || undefined;
        subtask.completed_at = normalizeTimestamp(subtask.completed_at) || undefined;
        subtask.due_on = normalizeTimestamp(subtask.due_on) || undefined;

        // Assigned subtasks map (only if subtask has an assignee)
        if (subtask.assignee) {
          const assigneeGid = subtask.assignee.gid;
          if (!subtasksByAssignee.has(assigneeGid)) {
            subtasksByAssignee.set(assigneeGid, []);
          }
          subtasksByAssignee.get(assigneeGid)!.push(subtask);
        }

        // For followers, add this subtask to each follower's collab map
        // but skip if follower is the same as the subtask assignee (avoid double-counting)
        (subtask.followers || []).forEach(follower => {
          if (!follower) return;
          if (subtask.assignee && follower.gid === subtask.assignee.gid) return; // skip owner
          const followerGid = follower.gid;
          if (!collabSubtasksByAssignee.has(followerGid)) {
            collabSubtasksByAssignee.set(followerGid, []);
          }
          collabSubtasksByAssignee.get(followerGid)!.push(subtask);
        });
      });
    });
  });
  
  // Calculate metrics for each assignee based on their subtasks
  subtasksByAssignee.forEach((subtasks, assigneeGid) => {
    const metrics = assigneeMetricsMap.get(assigneeGid);
    if (!metrics) return;

    // Basic counts (based on assigned subtasks only)
    metrics.total = subtasks.length;
    metrics.completed = subtasks.filter(s => s.completed).length;
    metrics.overdue = subtasks.filter(s => isSubtaskOverdue(s)).length;

    // Completion rate
    metrics.completionRate = metrics.total > 0 ? metrics.completed / metrics.total : 0;

    // Average lead time (only for completed subtasks)
    const completedSubtasks = subtasks.filter(s => s.completed && s.created_at && s.completed_at);
    if (completedSubtasks.length > 0) {
      const totalLeadTime = completedSubtasks.reduce((sum, subtask) => {
        const leadTime = calculateLeadTime(subtask.created_at, subtask.completed_at);
        return sum + (leadTime || 0);
      }, 0);

      metrics.avgTime = totalLeadTime / completedSubtasks.length;
    }

    // Weekly timeseries: pass both assigned subtasks and collab subtasks for this user
    const collabSubtasks = collabSubtasksByAssignee.get(assigneeGid) || [];
    metrics.weeklyTimeseries = generateWeeklyTimeseries(subtasks, collabSubtasks);
  });

  // Also populate metrics for users who are only followers (no assigned subtasks)
  collabSubtasksByAssignee.forEach((collabs, userGid) => {
    if (subtasksByAssignee.has(userGid)) return; // already processed as assignee
    const metrics = assigneeMetricsMap.get(userGid);
    if (!metrics) return;

    // totals remain zero for assigned, but we still want weekly collab series
    metrics.total = 0;
    metrics.completed = 0;
    metrics.overdue = 0;
    metrics.completionRate = 0;
    metrics.avgTime = 0;
    metrics.weeklyTimeseries = generateWeeklyTimeseries([], collabs);
  });
  
  // Remove assignees with no subtasks
  const result = Array.from(assigneeMetricsMap.values()).filter(metrics => metrics.total > 0);
  
  console.log(`Processed metrics for ${result.length} assignees`);
  return result;
}

/**
 * Get metrics for a specific assignee
 */
export function getAssigneeMetrics(report: AsanaReport, assigneeGid: string): AssigneeMetrics | null {
  const allMetrics = processAsanaReport(report);
  return allMetrics.find(metrics => metrics.assignee.gid === assigneeGid) || null;
}

/**
 * Filter subtasks based on filter criteria
 */
export function filterSubtasks(subtasks: Subtask[], filters: FilterOptions): Subtask[] {
  return subtasks.filter(subtask => {
    // Time range filter
    if (filters.timeRange) {
      const start = dayjs(filters.timeRange.start).utc();
      const end = dayjs(filters.timeRange.end).utc();
      
      // Check if subtask was created or completed in the time range
      const createdInRange = subtask.created_at && 
        dayjs(subtask.created_at).utc().isBetween(start, end, null, '[]');
      const completedInRange = subtask.completed_at && 
        dayjs(subtask.completed_at).utc().isBetween(start, end, null, '[]');
      
      if (!createdInRange && !completedInRange) {
        return false;
      }
    }
    
    // Status filter
    if (filters.status && filters.status !== 'all') {
      switch (filters.status) {
        case 'completed':
          if (!subtask.completed) return false;
          break;
        case 'pending':
          if (subtask.completed) return false;
          break;
        case 'overdue':
          if (!isSubtaskOverdue(subtask)) return false;
          break;
      }
    }
    
    // Assignee filter
    if (filters.assignees && filters.assignees.length > 0) {
      if (!subtask.assignee || !filters.assignees.includes(subtask.assignee.gid)) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Generate export data from subtasks
 * Includes task context for better reporting
 */
export function generateExportData(report: AsanaReport, filters?: FilterOptions): ExportData[] {
  const exportData: ExportData[] = [];
  
  report.sections.forEach(section => {
    section.tasks.forEach(task => {
      task.subtasks?.forEach(subtask => {
        // Export owner row if there is an assignee
        const leadTime = calculateLeadTime(subtask.created_at, subtask.completed_at);

        if (subtask.assignee) {
          // Apply filters if provided (owner row)
          if (!filters || filterSubtasks([subtask], filters).length) {
            exportData.push({
              taskName: `${subtask.name}`,
              section: section.name,
              assignee: subtask.assignee.name,
              status: subtask.completed ? 'Completed' : 'Pending',
              createdDate: subtask.created_at || '',
              completedDate: subtask.completed_at || '',
              dueDate: subtask.due_on || '',
              leadTime: leadTime || 0,
              isOverdue: isSubtaskOverdue(subtask),
              owner: subtask.assignee.name,
              isFollower: false,
            });
          }
        }

        // Export rows for followers (collaborators) - include follower even if they are not the assignee
        (subtask.followers || []).forEach(follower => {
          if (!follower) return;

          // Skip follower if they are the owner (already exported above)
          if (subtask.assignee && follower.gid === subtask.assignee.gid) return;

          // Build a pseudo-subtask for filtering purposes where the assignee is the follower
          const followerSubtask: Subtask = {
            ...subtask,
            assignee: follower,
          } as Subtask;

          // Apply filters if provided (follower row)
          if (filters && !filterSubtasks([followerSubtask], filters).length) {
            return;
          }

          exportData.push({
            taskName: `${subtask.name}`,
            section: section.name,
            assignee: follower.name,
            status: subtask.completed ? 'Completed' : 'Pending',
            createdDate: subtask.created_at || '',
            completedDate: subtask.completed_at || '',
            dueDate: subtask.due_on || '',
            leadTime: leadTime || 0,
            isOverdue: isSubtaskOverdue(subtask),
            owner: subtask.assignee ? subtask.assignee.name : null,
            isFollower: true,
          });
        });
      });
    });
  });
  
  return exportData;
}

/**
 * Get summary statistics for the entire report
 */
export function getReportSummary(report: AsanaReport): {
  totalSubtasks: number;
  completedSubtasks: number;
  overdueSubtasks: number;
  avgLeadTime: number;
  uniqueAssignees: number;
  activeSections: number;
} {
  let totalSubtasks = 0;
  let completedSubtasks = 0;
  let overdueSubtasks = 0;
  const leadTimes: number[] = [];
  const assigneeSet = new Set<string>();
  let activeSections = 0;
  
  report.sections.forEach(section => {
    let sectionHasSubtasks = false;
    
    section.tasks.forEach(task => {
      task.subtasks?.forEach(subtask => {
        if (!subtask.assignee) return; // Skip unassigned subtasks
        
        sectionHasSubtasks = true;
        totalSubtasks++;
        assigneeSet.add(subtask.assignee.gid);
        
        if (subtask.completed) {
          completedSubtasks++;
        }
        
        if (isSubtaskOverdue(subtask)) {
          overdueSubtasks++;
        }
        
        const leadTime = calculateLeadTime(subtask.created_at, subtask.completed_at);
        if (leadTime !== null) {
          leadTimes.push(leadTime);
        }
      });
    });
    
    if (sectionHasSubtasks) {
      activeSections++;
    }
  });
  
  const avgLeadTime = leadTimes.length > 0 
    ? leadTimes.reduce((sum, time) => sum + time, 0) / leadTimes.length 
    : 0;
  
  return {
    totalSubtasks,
    completedSubtasks,
    overdueSubtasks,
    avgLeadTime,
    uniqueAssignees: assigneeSet.size,
    activeSections,
  };
}

/**
 * Validate report data quality
 */
export function validateReportData(report: AsanaReport): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  if (report.sections.length === 0) {
    errors.push('No sections found in report');
    return { isValid: false, warnings, errors };
  }
  
  let totalTasks = 0;
  let totalSubtasks = 0;
  let subtasksWithoutAssignees = 0;
  let subtasksWithoutCreatedDate = 0;
  
  report.sections.forEach((section, _sectionIndex) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    if (section.tasks.length === 0) {
      warnings.push(`Section "${section.name}" has no tasks`);
    }
    
    section.tasks.forEach((task, _taskIndex) => { // eslint-disable-line @typescript-eslint/no-unused-vars
      totalTasks++;
      
      if (!task.subtasks || task.subtasks.length === 0) {
        warnings.push(`Task "${task.name}" in section "${section.name}" has no subtasks`);
        return;
      }
      
      task.subtasks.forEach((subtask, _subtaskIndex) => { // eslint-disable-line @typescript-eslint/no-unused-vars
        totalSubtasks++;
        
        if (!subtask.assignee) {
          subtasksWithoutAssignees++;
        }
        
        if (!subtask.created_at) {
          subtasksWithoutCreatedDate++;
        }
        
        // Validate date formats
        if (subtask.created_at && !dayjs(subtask.created_at).isValid()) {
          errors.push(
            `Invalid created_at date in subtask "${subtask.name}" ` +
            `of task "${task.name}" in section "${section.name}"`
          );
        }
        
        if (subtask.completed_at && !dayjs(subtask.completed_at).isValid()) {
          errors.push(
            `Invalid completed_at date in subtask "${subtask.name}" ` +
            `of task "${task.name}" in section "${section.name}"`
          );
        }
      });
    });
  });
  
  if (subtasksWithoutAssignees > 0) {
    warnings.push(`${subtasksWithoutAssignees} subtasks have no assignee`);
  }
  
  if (subtasksWithoutCreatedDate > 0) {
    warnings.push(`${subtasksWithoutCreatedDate} subtasks have no created date`);
  }
  
  if (totalSubtasks === 0) {
    errors.push('No subtasks found in report');
  }
  
  const isValid = errors.length === 0;
  
  console.log(
    `Report validation: ${totalTasks} tasks, ${totalSubtasks} subtasks. ` +
    `${warnings.length} warnings, ${errors.length} errors`
  );
  
  return { isValid, warnings, errors };
}