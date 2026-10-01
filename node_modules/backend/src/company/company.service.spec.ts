import { Test, TestingModule } from '@nestjs/testing';
import { CompanyService } from './company.service.js';
import { CompanyRepository } from './repositories/company.repository.js';

describe('CompanyService', () => {
  let service: CompanyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        { provide: CompanyRepository, useValue: { getUserCompanies: vi.fn(), createWithOwner: vi.fn(), verifyUserBelongsToCompany: vi.fn(), update: vi.fn() } },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
