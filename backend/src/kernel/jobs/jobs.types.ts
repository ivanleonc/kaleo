export type JobStatus = 'pending' | 'running' | 'completed' | 'dead_letter';

export interface JobRow {
  id: string;
  company_id: string;
  queue: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  run_at: string;
  attempts: number;
  max_attempts: number;
  locked_at: string | null;
  locked_by: string | null;
  last_error: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobInput {
  companyId: string;
  queue: string;
  payload?: Record<string, unknown>;
  runAt?: Date;
  maxAttempts?: number;
}

export type JobHandler = (job: JobRow) => Promise<void>;
