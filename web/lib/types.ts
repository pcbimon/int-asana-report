export type StatusFilter = "all" | "pending" | "completed" | "overdue";

export type WeeklyPoint = { week: string; assigned: number; completed: number; overdue: number; collab: number; expected: number };

export type CurrentTaskRow = {
  gid: string;
  name: string;
  week: string;
  created_at: Date | null;
  due_on: Date | null;
  status: "Pending" | "Completed" | "Overdue";
  type: "Owner" | "Collaborator";
  followers?: string[];
};
