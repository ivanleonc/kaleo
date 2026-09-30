import { Injectable } from '@nestjs/common';
import { BranchRepository } from './repositories/branch.repository.js';
import type { SortSpec } from '../common/dto/pagination-query.dto.js';

@Injectable()
export class BranchService {
  constructor(private readonly branchRepository: BranchRepository) {}

  async getBranches(
    companyId: string,
    page = 1,
    limit = 20,
    filters: { search?: string; status?: string } = {},
    sort: SortSpec = {},
  ) {
    return this.branchRepository.findPagedByCompany(companyId, page, limit, filters, sort);
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
