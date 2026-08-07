export type Role = 'employee' | 'manager' | 'admin' | 'hr' | 'ceo';

export type Status = 'Active' | 'On Leave' | 'Inactive';
export type TimesheetStatus = 'Submitted' | 'Approved' | 'Rejected' | 'Pending' | 'In Progress' | 'Not Started';
export type ProjectStatus = 'Not Started' | 'Ongoing' | 'Completed' | 'On Track' | 'At Risk' | 'Over Budget' | 'Delayed';
export type ProjectType = 'Internal' | 'Billable';
export type Priority = 'High' | 'Medium' | 'Low' | 'Critical';
export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed';
export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  designation: string;
  avatar: string;
  initials: string;
  color: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  type?: ProjectType;
  projectType?: ProjectType;
  totalHours: number;
  loggedHours: number;
  dueDate: string;
  teamMembers: (string | { id?: string; name: string; initials?: string; color?: string; role?: string })[];
  managers?: { id?: string; name: string; initials?: string; color?: string; role?: string }[];
  progress: number;
}

export interface WorkLog {
  id: string;
  userId: string;
  projectId: string;
  projectName: string;
  taskName: string;
  linkedTickets: Ticket[];
  hours: number;
  date: string;
  status: TaskStatus;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  ticketUrl?: string;
  provider: string;
}

export interface Timesheet {
  id: string;
  userId: string;
  userName: string;
  userInitials: string;
  userColor: string;
  userDesignation: string;
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  status: TimesheetStatus;
  projects: string[];
  submittedDate: string;
}

export interface Approval {
  id: string;
  timesheetId: string;
  employee: User;
  period: string;
  projects: string[];
  hours: number;
  submittedDate: string;
  status: ApprovalStatus;
  comments?: string;
}

export interface Notification {
  id: string;
  type: 'approval' | 'submission' | 'project';
  message: string;
  time: string;
  read: boolean;
}

export interface ActivityItem {
  id: string;
  userId: string;
  userInitials: string;
  userColor: string;
  message: string;
  time: string;
}

export interface DeptUtilization {
  dept: string;
  utilization: number;
  color: string;
}
