/**
 * Asana API helpers with retry logic and rate limiting
 * Handles communication with Asana REST API v1.0
 */

import axios, { AxiosResponse, AxiosError } from 'axios';
import { Section, Task, Subtask } from '@/models/asanaReport';

// API Configuration
const BASE_URL = process.env.ASANA_BASE_URL || 'https://app.asana.com/api/1.0';
const TOKEN = process.env.ASANA_TOKEN;
const PROJECT_ID = process.env.ASANA_PROJECT_ID;
const TEAM_ID = process.env.ASANA_TEAM_ID;

if (!TOKEN) {
  throw new Error('ASANA_TOKEN environment variable is required');
}

if (!PROJECT_ID) {
  throw new Error('ASANA_PROJECT_ID environment variable is required');
}

// Rate limiting configuration
const RATE_LIMIT = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
};

/**
 * Sleep utility for delays
 */
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate exponential backoff delay
 */
const getRetryDelay = (attempt: number): number => {
  const delay = RATE_LIMIT.baseDelay * Math.pow(2, attempt);
  return Math.min(delay, RATE_LIMIT.maxDelay);
};

/**
 * Generic API request with retry logic and rate limiting
 */
async function apiRequest<T>(
  url: string,
  retryCount = 0
): Promise<T> {
  try {
    const response: AxiosResponse<{ data: T }> = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    return response.data.data;
  } catch (error) {
    const axiosError = error as AxiosError;

    // Handle rate limiting (429) or server errors (5xx)
    if (
      (axiosError.response?.status === 429 || 
       (axiosError.response?.status && axiosError.response.status >= 500)) &&
      retryCount < RATE_LIMIT.maxRetries
    ) {
      const delay = getRetryDelay(retryCount);
      console.warn(
        `API request failed with status ${axiosError.response?.status}. ` +
        `Retrying in ${delay}ms... (attempt ${retryCount + 1}/${RATE_LIMIT.maxRetries})`
      );
      
      await sleep(delay);
      return apiRequest<T>(url, retryCount + 1);
    }

    // Handle other errors
    if (axiosError.response) {
      throw new Error(
        `Asana API error ${axiosError.response.status}: ${axiosError.response.statusText}`
      );
    } else if (axiosError.request) {
      throw new Error('Network error: Unable to reach Asana API');
    } else {
      throw new Error(`Request error: ${axiosError.message}`);
    }
  }
}

/**
 * Raw API response interfaces from Asana
 */
interface AsanaSection {
  gid: string;
  name: string;
}

interface AsanaTask {
  gid: string;
  name: string;
  assignee?: {
    gid: string;
    name: string;
    email?: string;
  };
  completed: boolean;
  completed_at?: string;
  due_on?: string;
  projects?: Array<{
    gid: string;
    name: string;
  }>;
  created_at?: string;
}

interface AsanaSubtask {
  gid: string;
  name: string;
  assignee?: {
    gid: string;
    name: string;
    email?: string;
  };
  completed: boolean;
  created_at?: string;
  completed_at?: string;
  due_on?: string;
  followers?: Array<{
    gid: string;
    name: string;
  }>;
}
interface AsanaUserInfo {
  gid: string;
  name: string;
  email: string;
}
interface AsanaTeamMember {
  gid: string;
  team: {
    gid: string;
    name: string;
  };
  user:{
    gid: string;
    name: string;
  }
  resource_type: string;
}

/**
 * Fetch all sections from the project
 */
export async function fetchSections(): Promise<Section[]> {
  try {
    console.log('Fetching sections for project:', PROJECT_ID);
    
    const url = `${BASE_URL}/projects/${PROJECT_ID}/sections`;
    const sections = await apiRequest<AsanaSection[]>(url);
    
    console.log(`Fetched ${sections.length} sections`);
    
    return sections.map(section => ({
      gid: section.gid,
      name: section.name,
      tasks: [], // Tasks will be populated separately
    }));
  } catch (error) {
    console.error('Error fetching sections:', error);
    throw error;
  }
}

/**
 * Fetch all tasks in a specific section
 */
export async function fetchTasksInSection(sectionGid: string): Promise<Task[]> {
  try {
    console.log('Fetching tasks for section:', sectionGid);
    
    const url = `${BASE_URL}/sections/${sectionGid}/tasks?opt_fields=name,assignee,completed,completed_at,due_on,projects,created_at`;
    const tasks = await apiRequest<AsanaTask[]>(url);
    
    console.log(`Fetched ${tasks.length} tasks for section ${sectionGid}`);
    
    return tasks.map(task => ({
      gid: task.gid,
      name: task.name,
      assignee: task.assignee ? {
        gid: task.assignee.gid,
        name: task.assignee.name,
        email: task.assignee.email,
      } : undefined,
      completed: task.completed,
      completed_at: task.completed_at,
      due_on: task.due_on,
      project: task.projects?.[0]?.name,
      created_at: task.created_at,
      section_gid: sectionGid,
      subtasks: [], // Subtasks will be populated separately
    }));
  } catch (error) {
    console.error(`Error fetching tasks for section ${sectionGid}:`, error);
    throw error;
  }
}

/**
 * Fetch all subtasks for a specific task
 */
export async function fetchSubtasks(taskGid: string): Promise<Subtask[]> {
  try {
    const url = `${BASE_URL}/tasks/${taskGid}/subtasks?opt_fields=name,assignee,completed,created_at,completed_at,due_on,followers.name`;
    const subtasks = await apiRequest<AsanaSubtask[]>(url);

    return subtasks.map(subtask => ({
      gid: subtask.gid,
      name: subtask.name,
      assignee: subtask.assignee ? {
        gid: subtask.assignee.gid,
        name: subtask.assignee.name,
        email: subtask.assignee.email,
      } : undefined,
      completed: subtask.completed,
      created_at: subtask.created_at,
      completed_at: subtask.completed_at,
      parent_task_gid: taskGid,
      due_on: subtask.due_on,
      followers: subtask.followers?.map(follower => ({subtask_gid: subtask.gid, assignee_gid: follower.gid})) || [],
    }));
  } catch (error) {
    console.error(`Error fetching subtasks for task ${taskGid}:`, error);
    throw error;
  }
}
/**
 * Fetch Team Members of the workspace
 */
export async function fetchTeamMembers(): Promise<AsanaTeamMember[]> {
  try {
    console.log('Fetching team members for project:', TEAM_ID);
    if (!TEAM_ID) {
      throw new Error('ASANA_TEAM_ID environment variable is required to fetch team members');
    }
    const url = `${BASE_URL}/team_memberships?team=${TEAM_ID}`;
    const members = await apiRequest<AsanaTeamMember[]>(url);
    
    console.log(`Fetched ${members.length} team members`);
    return members;
  } catch (error) {
    console.error('Error fetching team members:', error);
    throw error;
  }
}
/**
 * Fetch User Info
 */
export async function fetchUserInfo(userGid:string): Promise<AsanaUserInfo> {
  try {
    const url = `${BASE_URL}/users/${userGid}`;
    const userInfo = await apiRequest<AsanaUserInfo>(url);
    return {
      gid: userInfo.gid,
      name: userInfo.name,
      email: userInfo.email,
    };
  } catch (error) {
    console.error('Error fetching user info:', error);
    throw error;
  }
}

/**
 * Fetch complete report data with all sections, tasks, and subtasks
 * Uses parallel requests for better performance
 */
export async function fetchCompleteReport(): Promise<{
  sections: Section[];
  totalTasks: number;
  totalSubtasks: number;
  assigneeMap: Map<string, AsanaUserInfo>;
}> {
  try {
    console.log('Starting complete report fetch...');
    const startTime = Date.now();
    
    // Step 1: Fetch all sections
    const sections = await fetchSections();
    
    // Step 2: Fetch all tasks for all sections in parallel
    console.log('Fetching tasks for all sections...');
    const taskPromises = sections.map(section => 
      fetchTasksInSection(section.gid)
    );
    
    const allTasksArrays = await Promise.all(taskPromises);
    
    // Populate sections with their tasks
    sections.forEach((section, index) => {
      section.tasks = allTasksArrays[index];
    });
    
    // Step 3: Fetch all subtasks for all tasks in parallel
    console.log('Fetching subtasks for all tasks...');
    const allTasks = sections.flatMap(section => section.tasks);
    
    const subtaskPromises = allTasks.map(task => 
      fetchSubtasks(task.gid)
    );
    
    const allSubtasksArrays = await Promise.all(subtaskPromises);
    
    // Populate tasks with their subtasks
    allTasks.forEach((task, index) => {
      task.subtasks = allSubtasksArrays[index];
    });
    
    const totalTasks = allTasks.length;
    const totalSubtasks = allSubtasksArrays.flat().length;
    // get all team members to map user info
    const teamMembers = await fetchTeamMembers();
    // Fetch user info for all assignees in parallel
    const assigneePromises = Array.from(teamMembers).map(member => fetchUserInfo(member.user.gid));
    const assignees = await Promise.all(assigneePromises);
    const assigneeMap = new Map(assignees.map(user => [user.gid, user]));

    const duration = Date.now() - startTime;
    console.log(
      `Complete report fetch finished in ${duration}ms. ` +
      `${sections.length} sections, ${totalTasks} tasks, ${totalSubtasks} subtasks`
    );
    
    return {
      sections,
      totalTasks,
      totalSubtasks,
      assigneeMap,
    };
  } catch (error) {
    console.error('Error fetching complete report:', error);
    throw error;
  }
}

/**
 * Test API connection and credentials
 */
export async function testConnection(): Promise<boolean> {
  try {
    const url = `${BASE_URL}/users/me`;
    await apiRequest(url);
    console.log('Asana API connection successful');
    return true;
  } catch (error) {
    console.error('Asana API connection failed:', error);
    return false;
  }
}

/**
 * Get rate limit status from last response headers
 * Note: This is a basic implementation. In production, you might want to
 * store and track rate limit headers from actual responses
 */
export function getRateLimitStatus(): {
  remaining: number | null;
  resetTime: Date | null;
} {
  // This would need to be implemented based on actual rate limit headers
  // from Asana responses. For now, return null values.
  return {
    remaining: null,
    resetTime: null,
  };
}