export type DocumentStatus = 'active' | 'archived';

export interface DocumentRow {
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

export interface DocumentVersionRow {
  id: string;
  company_id: string;
  document_id: string;
  version: number;
  storage_key: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  checksum_sha256: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface DocumentLinkRow {
  id: string;
  company_id: string;
  document_id: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}

export interface DocumentListItem extends DocumentRow {
  filename: string;
  content_type: string;
  size_bytes: number;
  checksum_sha256: string;
  links_count: number;
}

export interface DocumentDetail {
  document: DocumentRow;
  versions: DocumentVersionRow[];
  links: DocumentLinkRow[];
}

export type PublicDocumentVersion = Omit<DocumentVersionRow, 'storage_key'>;

export interface PublicDocumentDetail {
  document: DocumentRow;
  versions: PublicDocumentVersion[];
  links: DocumentLinkRow[];
}

export interface DocumentFileInput {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

export interface CreateDocumentInput {
  title: string;
  description?: string | null;
  category?: string | null;
  link?: { entityType: string; entityId: string } | null;
}

export interface UpdateDocumentInput {
  title?: string;
  description?: string | null;
  category?: string | null;
  status?: DocumentStatus;
}
