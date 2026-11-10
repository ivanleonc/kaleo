export type AiToolRisk = 'read' | 'conversational' | 'business_write' | 'external';
export type AiRunStatus =
  | 'pending'
  | 'awaiting_confirmation'
  | 'running'
  | 'completed'
  | 'rejected'
  | 'failed';
export type AiActionStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';

export interface AiToolRow {
  code: string;
  module_code: string;
  name: string;
  description: string | null;
  risk: AiToolRisk;
  requires_confirmation: boolean;
  permission: string | null;
  input_schema: Record<string, unknown>;
  is_active: boolean;
}

export interface AiRunRow {
  id: string;
  company_id: string;
  user_id: string;
  tool_code: string;
  status: AiRunStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface AiActionRow {
  id: string;
  company_id: string;
  run_id: string;
  tool_code: string;
  requested_by: string;
  status: AiActionStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  approved_by: string | null;
  approved_at: string | null;
  executed_at: string | null;
  created_at: string;
}
