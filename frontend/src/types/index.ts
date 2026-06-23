export type UserRole = "admin" | "team_lead" | "member";

export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  role: UserRole;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  created_at: string;
}

export interface Team {
  id: number;
  name: string;
  description: string | null;
  leader_id: number;
  created_at: string;
}

export interface TeamDetail extends Team {
  member_ids: number[];
}

export interface ChecklistItem {
  id: number;
  task_id: number;
  text: string;
  is_done: boolean;
}

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  project_id: number;
  assignee_id: number | null;
  team_id: number | null;
  created_at: string;
}
