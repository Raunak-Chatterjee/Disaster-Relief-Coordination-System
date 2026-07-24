export type PriorityLevel = 'Low' | 'Medium' | 'High';
export type RequestStatus = 'Pending' | 'Assigned' | 'Completed';

export interface ReliefRequest {
  id: string;
  name: string;
  location: string;
  contact: string;
  help_type: string;
  priority: PriorityLevel;
  description: string;
  status: RequestStatus;
  assigned_volunteer: string | null;
  created_at: string;
}

export interface SystemStats {
  total: number;
  pending: number;
  assigned: number;
  completed: number;
  volunteers: number;
}
