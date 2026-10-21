import { Injectable } from '@nestjs/common';
import { BranchRepository } from './repositories/branch.repository.js';
import type { SortSpec } from '../common/dto/pagination-query.dto.js';
import type { ExportFile, ExportFormat } from '../common/export/export.types.js';
import { TabularExportService } from '../common/export/tabular-export.service.js';
import { BRANCH_EXPORT_COLUMNS } from './branch-export.columns.js';

@Injectable()
export class BranchService {
  constructor(
    private readonly branchRepository: BranchRepository,
    private readonly exportService: TabularExportService,
  ) {}

  async getBranches(
    companyId: string,
    page = 1,
    limit = 20,
    filters: { search?: string; status?: string } = {},
    sort: SortSpec = {},
  ) {
    return this.branchRepository.findPagedByCompany(companyId, page, limit, filters, sort);
  }

  async exportBranches(
    companyId: string,
    filters: { search?: string; status?: string },
    sort: SortSpec,
    format: ExportFormat,
    columns?: string[],
  ): Promise<ExportFile> {
    const rows = await this.branchRepository.findForExport(companyId, filters, sort);
    const selected = this.exportService.resolveColumns(BRANCH_EXPORT_COLUMNS, columns);

    return this.exportService.generate(format, selected, rows, {
      filename: `sedes_${new Date().toISOString().slice(0, 10)}`,
      sheetName: 'Sedes',
    });
  }

  async getBranchById(companyId: string, branchId: string) {
    return this.branchRepository.findById(branchId, companyId);
  }

  async createBranch(companyId: string, data: {
    name: string; address?: string; city?: string; state?: string;
    country?: string; postal_code?: string; phone?: string; email?: string;
    code?: string; manager_user_id?: string; timezone?: string;
  }) {
    return this.branchRepository.create(companyId, data);
  }

  async updateBranch(companyId: string, branchId: string, data: {
    name?: string; address?: string; city?: string; state?: string;
    country?: string; postal_code?: string; phone?: string; email?: string; is_active?: boolean;
    code?: string; is_main?: boolean; manager_user_id?: string; timezone?: string;
  }) {
    return this.branchRepository.update(branchId, companyId, data);
  }

  async deleteBranch(companyId: string, branchId: string) {
    return this.branchRepository.softDelete(branchId, companyId);
  }
}
