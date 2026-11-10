export type OperationKind = 'export' | 'report' | 'import';
export type OperationStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface Operation {
  id: string;
  kind: OperationKind;
  resource: string;
  format: string | null;
  status: OperationStatus;
  filename: string | null;
  content_type: string | null;
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export type ExportResource = 'members' | 'branches' | 'analyses' | 'audit';
