export type DocumentStatus = 'active' | 'archived';

export interface DocumentRecord {
  id: string;
  company_id: string;
  module_code: string;
  title: string;
  description: string | null;
  category: string | null;
  status: DocumentStatus;
  current_version: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentListItem extends DocumentRecord {
  filename: string;
  content_type: string;
  size_bytes: number;
  checksum_sha256: string;
  links_count: number;
}

export interface DocumentVersion {
  id: string;
  company_id: string;
  document_id: string;
  version: number;
  filename: string;
  content_type: string;
  size_bytes: number;
  checksum_sha256: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface DocumentLink {
  id: string;
  company_id: string;
  document_id: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}

export interface DocumentDetail {
  document: DocumentRecord;
  versions: DocumentVersion[];
  links: DocumentLink[];
}
