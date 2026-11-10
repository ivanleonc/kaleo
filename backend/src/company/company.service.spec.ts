import { Test, TestingModule } from '@nestjs/testing';
import { CompanyService } from './company.service.js';
import { CompanyRepository } from './repositories/company.repository.js';
import { AuditLogService } from '../audit/audit-log.service.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { TenantContextService } from '../common/tenancy/tenant-context.service.js';

describe('CompanyService', () => {
  let service: CompanyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        { provide: CompanyRepository, useValue: { getUserCompanies: vi.fn(), createWithOwner: vi.fn(), verifyUserBelongsToCompany: vi.fn(), update: vi.fn() } },
        { provide: AuditLogService, useValue: { logInTransaction: vi.fn() } },
        { provide: OutboxService, useValue: { enqueue: vi.fn() } },
        { provide: TenantContextService, useValue: { get: vi.fn() } },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
