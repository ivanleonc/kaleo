import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { CompanyController } from './company.controller.js';
import { CompanyService } from './company.service.js';
import { SuperAdminGuard } from '../common/guards/super-admin.guard.js';

describe('CompanyController', () => {
  let controller: CompanyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyController],
      providers: [
        { provide: CompanyService, useValue: { getUserCompanies: vi.fn(), getAllCompanies: vi.fn(), createCompany: vi.fn(), updateCompanyInfo: vi.fn() } },
      ],
    })
      // SuperAdminGuard exige DataSource: se sustituye por pase directo.
      .overrideGuard(SuperAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CompanyController>(CompanyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
