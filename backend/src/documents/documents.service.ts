import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { DocumentsRepository, type DocumentListFilters } from './documents.repository.js';
import { DocumentStorageService } from './storage/document-storage.service.js';
import { EntitlementService } from '../kernel/billing/entitlement.service.js';
import type {
  CreateDocumentInput,
  DocumentDetail,
  DocumentFileInput,
  DocumentListItem,
  DocumentRow,
  DocumentVersionRow,
  PublicDocumentDetail,
  PublicDocumentVersion,
  UpdateDocumentInput,
} from './documents.types.js';

export const DOCUMENTS_MODULE_CODE = 'shared.documents';
export const DOCUMENT_MAX_BYTES = 25 * 1024 * 1024;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ENTITY_TYPE_RE = /^[a-z][a-z0-9_.-]{1,63}$/;

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly repository: DocumentsRepository,
    private readonly storage: DocumentStorageService,
    private readonly entitlements: EntitlementService,
  ) {}

  async list(
    companyId: string,
    filters: DocumentListFilters,
  ): Promise<{ items: DocumentListItem[]; total: number }> {
    return this.repository.list(companyId, filters);
  }

  async get(companyId: string, documentId: string): Promise<PublicDocumentDetail> {
    const detail = await this.repository.getDetail(companyId, documentId);
    if (!detail) throw new NotFoundException('Documento no encontrado');
    return publicDetail(detail);
  }

  async create(
    companyId: string,
    userId: string,
    input: CreateDocumentInput,
    file: DocumentFileInput,
  ): Promise<PublicDocumentDetail> {
    await this.entitlements.assertWritableModule(companyId, DOCUMENTS_MODULE_CODE);
    this.assertFile(file);

    const title = input.title?.trim() || stripExtension(file.filename) || 'Documento';
    const link = this.normalizeLink(input.link);
    const documentId = randomUUID();
    const storageKey = this.storageKey(companyId, documentId);
    const checksum = checksumOf(file.buffer);

    await this.storage.put(storageKey, file.buffer, file.contentType);

    try {
      const detail = await this.repository.create(
        companyId,
        userId,
        documentId,
        {
          title,
          description: input.description?.trim() || null,
          category: input.category?.trim() || null,
          link,
        },
        {
          storageKey,
          filename: safeFilename(file.filename),
          contentType: file.contentType || 'application/octet-stream',
          sizeBytes: file.buffer.length,
          checksum,
        },
      );
      return publicDetail(detail);
    } catch (error) {
      await this.cleanup(storageKey);
      throw error;
    }
  }

  async addVersion(
    companyId: string,
    userId: string,
    documentId: string,
    file: DocumentFileInput,
  ): Promise<{ document: DocumentRow; version: PublicDocumentVersion }> {
    await this.entitlements.assertWritableModule(companyId, DOCUMENTS_MODULE_CODE);
    this.assertFile(file);

    const detail = await this.get(companyId, documentId);
    if (detail.document.status === 'archived') {
      throw new BadRequestException('No se pueden agregar versiones a un documento archivado');
    }

    const storageKey = this.storageKey(companyId, documentId);
    await this.storage.put(storageKey, file.buffer, file.contentType);

    try {
      const result = await this.repository.addVersion(companyId, userId, documentId, {
        storageKey,
        filename: safeFilename(file.filename),
        contentType: file.contentType || 'application/octet-stream',
        sizeBytes: file.buffer.length,
        checksum: checksumOf(file.buffer),
      });
      if (!result) throw new NotFoundException('Documento no encontrado');
      return { document: result.document, version: publicVersion(result.version) };
    } catch (error) {
      await this.cleanup(storageKey);
      throw error;
    }
  }

  async update(
    companyId: string,
    userId: string,
    documentId: string,
    input: UpdateDocumentInput,
  ): Promise<DocumentRow> {
    await this.entitlements.assertWritableModule(companyId, DOCUMENTS_MODULE_CODE);

    const detail = await this.get(companyId, documentId);
    const status = input.status ?? detail.document.status;
    if (status !== 'active' && status !== 'archived') {
      throw new BadRequestException('Estado de documento inválido');
    }

    const updated = await this.repository.update(companyId, userId, documentId, {
      title: input.title?.trim() || detail.document.title,
      description:
        input.description === undefined
          ? detail.document.description
          : input.description?.trim() || null,
      category:
        input.category === undefined
          ? detail.document.category
          : input.category?.trim() || null,
      status,
    });
    if (!updated) throw new NotFoundException('Documento no encontrado');
    return updated;
  }

  async delete(companyId: string, documentId: string): Promise<void> {
    await this.entitlements.assertWritableModule(companyId, DOCUMENTS_MODULE_CODE);
    const storageKeys = await this.repository.delete(companyId, documentId);
    if (!storageKeys) throw new NotFoundException('Documento no encontrado');

    await Promise.allSettled(storageKeys.map((key) => this.storage.delete(key)));
  }

  async download(
    companyId: string,
    documentId: string,
    version?: number,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    if (version !== undefined && (!Number.isInteger(version) || version < 1)) {
      throw new BadRequestException('La versión debe ser un entero mayor a cero');
    }

    const row = await this.repository.getVersion(companyId, documentId, version);
    if (!row) throw new NotFoundException('Versión de documento no encontrada');

    const buffer = await this.storage.get(row.storage_key);
    return {
      buffer,
      filename: row.filename,
      contentType: row.content_type,
    };
  }

  async addLink(
    companyId: string,
    documentId: string,
    input: { entityType: string; entityId: string },
  ) {
    await this.entitlements.assertWritableModule(companyId, DOCUMENTS_MODULE_CODE);
    const link = this.normalizeLink(input);
    if (!link) throw new BadRequestException('Vínculo inválido');

    const created = await this.repository.addLink(
      companyId,
      documentId,
      link.entityType,
      link.entityId,
    );
    if (!created) throw new NotFoundException('Documento no encontrado');
    return created;
  }

  async removeLink(
    companyId: string,
    documentId: string,
    linkId: string,
  ): Promise<void> {
    await this.entitlements.assertWritableModule(companyId, DOCUMENTS_MODULE_CODE);
    const removed = await this.repository.removeLink(companyId, documentId, linkId);
    if (!removed) throw new NotFoundException('Vínculo no encontrado');
  }

  private assertFile(file: DocumentFileInput): void {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Falta el archivo');
    }
    if (file.buffer.length > DOCUMENT_MAX_BYTES) {
      throw new PayloadTooLargeException(
        `El archivo supera el máximo de ${Math.round(DOCUMENT_MAX_BYTES / 1024 / 1024)} MB`,
      );
    }
  }

  private normalizeLink(
    link: { entityType: string; entityId: string } | null | undefined,
  ): { entityType: string; entityId: string } | null {
    if (!link) return null;
    const entityType = link.entityType?.trim().toLowerCase();
    const entityId = link.entityId?.trim();
    if (!entityType || !ENTITY_TYPE_RE.test(entityType)) {
      throw new BadRequestException(
        'El tipo de vínculo debe usar minúsculas (ej: analysis, branch)',
      );
    }
    if (!entityId || !UUID_RE.test(entityId)) {
      throw new BadRequestException(
        'El UUID del vínculo no es válido. Deja ambos campos vacíos si no quieres asociar el documento.',
      );
    }
    return { entityType, entityId };
  }

  private storageKey(companyId: string, documentId: string): string {
    return `${companyId}/${documentId}/${randomUUID()}`;
  }

  private async cleanup(storageKey: string): Promise<void> {
    try {
      await this.storage.delete(storageKey);
    } catch (error) {
      this.logger.warn(
        `No se pudo limpiar el objeto ${storageKey}: ${(error as Error).message}`,
      );
    }
  }
}

function checksumOf(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/** La ruta interna de storage no sale de la API. */
function publicVersion(version: DocumentVersionRow): PublicDocumentVersion {
  const { storage_key: _storageKey, ...rest } = version;
  return rest;
}

function publicDetail(detail: DocumentDetail): PublicDocumentDetail {
  return {
    document: detail.document,
    versions: detail.versions.map(publicVersion),
    links: detail.links,
  };
}

function safeFilename(filename: string): string {
  return (filename || 'documento')
    .replace(/[\r\n"\\/]/g, '-')
    .trim()
    .slice(0, 255) || 'documento';
}

function stripExtension(filename: string): string {
  return (filename || '').replace(/\.[^.]+$/, '').trim();
}
