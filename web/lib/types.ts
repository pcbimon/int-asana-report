export type StatusFilter = "all" | "pending" | "completed" | "overdue";

export type WeeklyPoint = { week: string; assigned: number; completed: number; overdue: number; collab: number; expected: number };

export type CurrentTaskRow = {
  gid: string;
  name: string;
  week: string | null;
  created_at: string | null;
  due_on: string | null;
  status: "Pending" | "Completed" | "Overdue";
  type: "Owner" | "Collaborator";
  followers?: string[];
};
