export const PROJECT_STATUSES = [
  'draft',
  'active',
  'on_hold',
  'completed',
  'cancelled',
] as const;

export const PROJECT_ROLES = [
  'manager',
  'estimator',
  'resident',
  'supervisor',
  'viewer',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type ProjectRole = (typeof PROJECT_ROLES)[number];

export interface ProjectRow {
  id: string;
  company_id: string;
  branch_id: string | null;
  branch_name: string | null;
  client_party_id: string | null;
  client_name: string | null;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  cover_url: string | null;
  status: ProjectStatus;
  currency_code: string;
  start_date: string | null;
  end_date: string | null;
  timezone: string | null;
  address: string | null;
  created_by: string | null;
  creator_name: string | null;
  creator_email: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  members_count: number;
  budget_id: string | null;
  budget_total: number;
  activity_count: number;
}

export interface ProjectMemberRow {
  company_id: string;
  project_id: string;
  membership_id: string;
  project_role: ProjectRole;
  created_at: string;
  user_id: string;
  user_name: string;
  user_email: string;
  membership_status: string;
}

export interface ProjectDetail extends ProjectRow {
  members: ProjectMemberRow[];
}

export interface ProjectListFilters {
  search?: string;
  status?: ProjectStatus;
  branchId?: string;
  clientPartyId?: string;
  page: number;
  limit: number;
}

export interface CreateProjectInput {
  code: string;
  name: string;
  description?: string | null;
  category?: string | null;
  coverUrl?: string | null;
  status?: ProjectStatus;
  branchId?: string | null;
  clientPartyId?: string | null;
  currencyCode: string;
  startDate?: string | null;
  endDate?: string | null;
  timezone?: string | null;
  address?: string | null;
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {}
