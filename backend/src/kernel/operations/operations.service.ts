import { Injectable, NotFoundException } from '@nestjs/common';
import { JobsService } from '../jobs/jobs.service.js';
import { OperationsRepository } from './operations.repository.js';
import type { ExportResource, OperationRow } from './operations.types.js';

export const EXPORT_JOB_QUEUE = 'export.generate';
export const REPORT_JOB_QUEUE = 'report.generate';
export const BRANCH_IMPORT_JOB_QUEUE = 'import.branches';

export interface ExportRequestOptions {
  filters?: Record<string, string | undefined>;
  columns?: string[];
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

@Injectable()
export class OperationsService {
  constructor(
    private readonly repository: OperationsRepository,
    private readonly jobs: JobsService,
  ) {}

  async requestExport(
    companyId: string,
    userId: string,
    resource: ExportResource,
    format: 'csv' | 'xlsx',
    options: ExportRequestOptions = {},
  ): Promise<OperationRow> {
    return this.createAndEnqueue(companyId, userId, 'export', resource, format, {
      filters: options.filters ?? {},
      columns: options.columns ?? [],
      sortBy: options.sortBy,
      sortDir: options.sortDir,
    });
  }

  async requestAnalysesReport(
    companyId: string,
    userId: string,
    format: 'csv' | 'xlsx',
  ): Promise<OperationRow> {
    return this.createAndEnqueue(
      companyId,
      userId,
      'report',
      'analyses_summary',
      format,
      {},
    );
  }

  async requestBranchImport(
    companyId: string,
    userId: string,
    rows: Record<string, unknown>[],
  ): Promise<OperationRow> {
    return this.createAndEnqueue(companyId, userId, 'import', 'branches', null, { rows });
  }

  private async createAndEnqueue(
    companyId: string,
    userId: string,
    kind: 'export' | 'report' | 'import',
    resource: string,
    format: string | null,
    payload: Record<string, unknown>,
  ): Promise<OperationRow> {
    const operation = await this.repository.create(companyId, userId, kind, resource, format);
    const queue =
      kind === 'export'
        ? EXPORT_JOB_QUEUE
        : kind === 'report'
          ? REPORT_JOB_QUEUE
          : BRANCH_IMPORT_JOB_QUEUE;

    try {
      await this.jobs.enqueue({
        companyId,
        queue,
        payload: { ...payload, operationId: operation.id, userId },
      });
    } catch (error) {
      await this.repository.markFailed(operation.id, (error as Error).message);
      throw error;
    }

    return operation;
  }

  async get(companyId: string, userId: string, id: string): Promise<OperationRow> {
    const operation = await this.repository.get(companyId, userId, id);
    if (!operation) throw new NotFoundException('Operación no encontrada');
    return operation;
  }

  async getForWorker(id: string): Promise<OperationRow> {
    const operation = await this.repository.getInternal(id);
    if (!operation) throw new NotFoundException('Operación no encontrada');
    return operation;
  }

  markProcessing(id: string) {
    return this.repository.markProcessing(id);
  }

  markReady(
    id: string,
    result: {
      filename?: string | null;
      contentType?: string | null;
      data?: Buffer | null;
      summary?: Record<string, unknown>;
    },
  ) {
    return this.repository.markReady(id, result);
  }

  markFailed(id: string, error: string) {
    return this.repository.markFailed(id, error);
  }
}
