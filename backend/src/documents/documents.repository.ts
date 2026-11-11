import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { withTenantTransaction } from '../common/tenancy/tenant-transaction.js';
import { TenantContextService } from '../common/tenancy/tenant-context.service.js';
import type {
  DocumentDetail,
  DocumentLinkRow,
  DocumentListItem,
  DocumentRow,
  DocumentStatus,
  DocumentVersionRow,
} from './documents.types.js';

export interface DocumentListFilters {
  search?: string;
  category?: string;
  status?: DocumentStatus;
  page: number;
  limit: number;
}

@Injectable()
export class DocumentsRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
  ) {}

  private assertCompany(companyId: string): void {
    if (this.tenantContext.requireCompanyId() !== companyId) {
      throw new ForbiddenException('La empresa no coincide con el TenantContext');
    }
  }

  async create(
    companyId: string,
    userId: string,
    documentId: string,
    input: {
      title: string;
      description: string | null;
      category: string | null;
      link: { entityType: string; entityId: string } | null;
    },
    version: {
      storageKey: string;
      filename: string;
      contentType: string;
      sizeBytes: number;
      checksum: string;
    },
  ): Promise<DocumentDetail> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const documents = (await queryRunner.query(
        `INSERT INTO documents
           (id, company_id, module_code, title, description, category, created_by, updated_by)
         VALUES ($1, $2, 'shared.documents', $3, $4, $5, $6, $6)
         RETURNING *`,
        [
          documentId,
          companyId,
          input.title,
          input.description,
          input.category,
          userId,
        ],
      )) as DocumentRow[];

      const versions = (await queryRunner.query(
        `INSERT INTO document_versions
           (company_id, document_id, version, storage_key, filename, content_type,
            size_bytes, checksum_sha256, uploaded_by)
         VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          companyId,
          documentId,
          version.storageKey,
          version.filename,
          version.contentType,
          version.sizeBytes,
          version.checksum,
          userId,
        ],
      )) as DocumentVersionRow[];

      let links: DocumentLinkRow[] = [];
      if (input.link) {
        links = (await queryRunner.query(
          `INSERT INTO document_links (company_id, document_id, entity_type, entity_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (company_id, document_id, entity_type, entity_id)
           DO UPDATE SET entity_type = EXCLUDED.entity_type
           RETURNING *`,
          [companyId, documentId, input.link.entityType, input.link.entityId],
        )) as DocumentLinkRow[];
      }

      return { document: documents[0], versions, links };
    });
  }

  async list(
    companyId: string,
    filters: DocumentListFilters,
  ): Promise<{ items: DocumentListItem[]; total: number }> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const params: unknown[] = [companyId];
      const where = ['d.company_id = $1'];

      if (filters.status) {
        params.push(filters.status);
        where.push(`d.status = $${params.length}`);
      }
      if (filters.category) {
        params.push(filters.category);
        where.push(`d.category = $${params.length}`);
      }
      if (filters.search) {
        params.push(`%${filters.search}%`);
        where.push(
          `(d.title ILIKE $${params.length} OR d.description ILIKE $${params.length}
            OR v.filename ILIKE $${params.length})`,
        );
      }

      const whereSql = where.join(' AND ');

      const countRows = (await queryRunner.query(
        `SELECT COUNT(*)::int AS total
         FROM documents d
         LEFT JOIN document_versions v
           ON v.document_id = d.id AND v.version = d.current_version
         WHERE ${whereSql}`,
        params,
      )) as Array<{ total: number }>;

      const limit = Math.min(Math.max(filters.limit, 1), 100);
      const offset = (Math.max(filters.page, 1) - 1) * limit;
      params.push(limit, offset);

      const items = (await queryRunner.query(
        `SELECT d.*,
                COALESCE(v.filename, '') AS filename,
                COALESCE(v.content_type, 'application/octet-stream') AS content_type,
                COALESCE(v.size_bytes, 0) AS size_bytes,
                COALESCE(v.checksum_sha256, '') AS checksum_sha256,
                (SELECT COUNT(*)::int FROM document_links l WHERE l.document_id = d.id)
                  AS links_count
         FROM documents d
         LEFT JOIN document_versions v
           ON v.document_id = d.id AND v.version = d.current_version
         WHERE ${whereSql}
         ORDER BY d.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      )) as DocumentListItem[];

      return { items, total: countRows[0]?.total ?? 0 };
    });
  }

  async getDetail(companyId: string, documentId: string): Promise<DocumentDetail | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const documents = (await queryRunner.query(
        `SELECT * FROM documents WHERE id = $1 AND company_id = $2`,
        [documentId, companyId],
      )) as DocumentRow[];
      if (!documents[0]) return null;

      const versions = (await queryRunner.query(
        `SELECT * FROM document_versions
         WHERE company_id = $1 AND document_id = $2
         ORDER BY version DESC`,
        [companyId, documentId],
      )) as DocumentVersionRow[];
      const links = (await queryRunner.query(
        `SELECT * FROM document_links
         WHERE company_id = $1 AND document_id = $2
         ORDER BY created_at`,
        [companyId, documentId],
      )) as DocumentLinkRow[];

      return { document: documents[0], versions, links };
    });
  }

  async getVersion(
    companyId: string,
    documentId: string,
    version?: number,
  ): Promise<DocumentVersionRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT v.*
         FROM document_versions v
         JOIN documents d ON d.id = v.document_id AND d.company_id = v.company_id
         WHERE v.company_id = $1 AND v.document_id = $2
           AND v.version = COALESCE($3, d.current_version)`,
        [companyId, documentId, version ?? null],
      )) as DocumentVersionRow[];
      return rows[0] ?? null;
    });
  }

  async addVersion(
    companyId: string,
    userId: string,
    documentId: string,
    version: {
      storageKey: string;
      filename: string;
      contentType: string;
      sizeBytes: number;
      checksum: string;
    },
  ): Promise<{ document: DocumentRow; version: DocumentVersionRow } | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const documents = (await queryRunner.query(
        `SELECT * FROM documents
         WHERE id = $1 AND company_id = $2
         FOR UPDATE`,
        [documentId, companyId],
      )) as DocumentRow[];
      if (!documents[0]) return null;

      const nextRows = (await queryRunner.query(
        `SELECT COALESCE(MAX(version), 0) + 1 AS next
         FROM document_versions WHERE document_id = $1`,
        [documentId],
      )) as Array<{ next: number }>;
      const nextVersion = Number(nextRows[0]?.next ?? 1);

      const versions = (await queryRunner.query(
        `INSERT INTO document_versions
           (company_id, document_id, version, storage_key, filename, content_type,
            size_bytes, checksum_sha256, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          companyId,
          documentId,
          nextVersion,
          version.storageKey,
          version.filename,
          version.contentType,
          version.sizeBytes,
          version.checksum,
          userId,
        ],
      )) as DocumentVersionRow[];

      const updated = (await queryRunner.query(
        `UPDATE documents
         SET current_version = $3, updated_by = $4
         WHERE id = $1 AND company_id = $2
         RETURNING *`,
        [documentId, companyId, nextVersion, userId],
      )) as DocumentRow[];

      return { document: updated[0], version: versions[0] };
    });
  }

  async update(
    companyId: string,
    userId: string,
    documentId: string,
    patch: {
      title: string;
      description: string | null;
      category: string | null;
      status: DocumentStatus;
    },
  ): Promise<DocumentRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `UPDATE documents
         SET title = $3, description = $4, category = $5, status = $6, updated_by = $7
         WHERE id = $1 AND company_id = $2
         RETURNING *`,
        [
          documentId,
          companyId,
          patch.title,
          patch.description,
          patch.category,
          patch.status,
          userId,
        ],
      )) as DocumentRow[];
      return rows[0] ?? null;
    });
  }

  async delete(companyId: string, documentId: string): Promise<string[] | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const versions = (await queryRunner.query(
        `SELECT storage_key FROM document_versions
         WHERE company_id = $1 AND document_id = $2`,
        [companyId, documentId],
      )) as Array<{ storage_key: string }>;

      const deleted = (await queryRunner.query(
        `DELETE FROM documents WHERE id = $1 AND company_id = $2 RETURNING id`,
        [documentId, companyId],
      )) as Array<{ id: string }>;

      if (!deleted[0]) return null;
      return versions.map((row) => row.storage_key);
    });
  }

  async addLink(
    companyId: string,
    documentId: string,
    entityType: string,
    entityId: string,
  ): Promise<DocumentLinkRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `INSERT INTO document_links (company_id, document_id, entity_type, entity_id)
         SELECT $1, d.id, $3, $4
         FROM documents d
         WHERE d.id = $2 AND d.company_id = $1
         ON CONFLICT (company_id, document_id, entity_type, entity_id)
         DO UPDATE SET entity_type = EXCLUDED.entity_type
         RETURNING *`,
        [companyId, documentId, entityType, entityId],
      )) as DocumentLinkRow[];
      return rows[0] ?? null;
    });
  }

  async removeLink(
    companyId: string,
    documentId: string,
    linkId: string,
  ): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `DELETE FROM document_links
         WHERE id = $1 AND document_id = $2 AND company_id = $3
         RETURNING id`,
        [linkId, documentId, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }
}
