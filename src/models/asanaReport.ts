/**
 * Data models for Asana Report Dashboard
 * These classes represent the structure of data from Asana API
 * and are used throughout the application for type safety
 */

export interface Assignee {
  gid: string;
  name: string;
  email?: string;
}

export interface Subtask {
  gid: string;
  name: string;
  assignee?: Assignee;
  completed: boolean;
  created_at?: string;
  completed_at?: string;
  due_on?: string;
  parent_task_gid?: string;
  followers?: Assignee[];
}
export interface Follower{
  subtask_gid: string;
  assignee_gid: string;
}
export interface Task {
  gid: string;
  name: string;
  assignee?: Assignee;
  completed: boolean;
  completed_at?: string;
  subtasks?: Subtask[];
  due_on?: string;
  project?: string;
  created_at?: string;
  section_gid?: string;
}

export interface Section {
  gid: string;
  name: string;
  tasks: Task[];
}
export interface TeamMember {
  gid: string;
  name: string;
}

export class AsanaReport {
  sections: Section[];
  teamMembers: TeamMember[];

  constructor(sections: Section[] = [], teamMembers: TeamMember[] = []) {
    this.sections = sections;
    this.teamMembers = teamMembers;
  }
  applyAssigneeMap(assigneeMap: Map<string, { gid: string; name: string; email?: string }>) {
    this.sections.forEach(section => {
      section.tasks.forEach(task => {
        if (task.assignee && assigneeMap.has(task.assignee.gid)) {
          task.assignee = assigneeMap.get(task.assignee.gid);
        }

        task.subtasks?.forEach(subtask => {
          if (subtask.assignee && assigneeMap.has(subtask.assignee.gid)) {
            subtask.assignee = assigneeMap.get(subtask.assignee.gid);
          }
        });
      });
    });
  }
  setTeamMembers(members: TeamMember[]) {
    this.teamMembers = members;
  }
  /**
   * Get all unique assignees from tasks and subtasks
   */
  getAllAssignees(): Assignee[] {
    const assigneeMap = new Map<string, Assignee>();

    // Collect assignees from tasks
    this.sections.forEach(section => {
      section.tasks.forEach(task => {
        if (task.assignee) {
          assigneeMap.set(task.assignee.gid, task.assignee);
        }

        // Collect assignees from subtasks
        task.subtasks?.forEach(subtask => {
          if (subtask.assignee) {
            assigneeMap.set(subtask.assignee.gid, subtask.assignee);
          }

          // Also collect followers as potential users (so follower-only users are discoverable)
          subtask.followers?.forEach(f => {
            if (f) {
              assigneeMap.set(f.gid, f);
            }
          });
        });
      });
    });

    return Array.from(assigneeMap.values());
  }

  /**
   * Get all subtasks for a specific assignee
   */
  getSubtasksForAssignee(assigneeGid: string): Subtask[] {
    const subtasks: Subtask[] = [];

    this.sections.forEach(section => {
      section.tasks.forEach(task => {
        task.subtasks?.forEach(subtask => {
          if (subtask.assignee?.gid === assigneeGid) {
            subtasks.push(subtask);
          }
        });
      });
    });

    return subtasks;
  }

  /**
   * Get all tasks that contain subtasks for a specific assignee
   */
  getTasksForAssignee(assigneeGid: string): Task[] {
    const tasks: Task[] = [];

    this.sections.forEach(section => {
      section.tasks.forEach(task => {
        const hasAssigneeSubtasks = task.subtasks?.some(
          subtask => subtask.assignee?.gid === assigneeGid
        );
        
        if (hasAssigneeSubtasks) {
          tasks.push(task);
        }
      });
    });

    return tasks;
  }
}

/**
 * Interface for aggregated metrics per assignee
 * All metrics are calculated from subtasks only
 */
export interface AssigneeMetrics {
  assignee: Assignee;
  total: number;           // Total subtasks assigned
  completed: number;       // Completed subtasks
  overdue: number;         // Overdue subtasks (due_on < today && not completed)
  completionRate: number;  // completed / total
  avgTime: number;         // Average time from created_at to completed_at (in days)
  weeklyTimeseries: WeeklyData[];
}

/**
 * Weekly timeseries data for charts
 */
export interface WeeklyData {
  week: string;           // ISO week string (YYYY-Www)
  weekStart: string;      // Start date of the week (ISO date)
  assigned: number;       // Count of subtasks created this week
  completed: number;      // Count of subtasks completed this week
  overdue: number;        // Count of subtasks that became overdue this week
  collab?: number;        // Count of subtasks where user is follower (collaboration)
}

/**
 * Filter options for the dashboard
 */
export interface FilterOptions {
  timeRange?: {
    start: string;        // ISO date
    end: string;          // ISO date
  };
  projects?: string[];    // Project names/IDs
  sections?: string[];    // Section names/IDs
  status?: 'all' | 'completed' | 'pending' | 'overdue';
  assignees?: string[];   // Assignee GIDs
}

/**
 * Export data structure for CSV/Excel
 */
export interface ExportData {
  taskName: string;
  section: string;
  assignee: string;
  status: string;
  createdDate: string;
  completedDate: string;
  dueDate: string;
  leadTime: number;       // Days from created to completed
  isOverdue: boolean;
  // Optional: when the exported row represents a follower (collaborator)
  // `assignee` will be the follower's name and `owner` is the actual subtask owner (if any)
  owner?: string | null;
  isFollower?: boolean;
}

/**
 * Sync metadata for tracking data updates
 */
export interface SyncMetadata {
  key: string;
  lastUpdated: string;    // ISO timestamp
  status: 'success' | 'error' | 'in-progress';
  message?: string;
  recordCount?: number;
}