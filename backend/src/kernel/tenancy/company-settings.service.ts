import { Injectable } from '@nestjs/common';
import { CompanySettingsRepository } from './company-settings.repository.js';
import type { CompanySettings } from './company-settings.types.js';

@Injectable()
export class CompanySettingsService {
  constructor(private readonly repository: CompanySettingsRepository) {}

  get(companyId: string): Promise<CompanySettings> {
    return this.repository.get(companyId);
  }

  update(
    companyId: string,
    data: {
      currencyCode?: string;
      locale?: string;
      settings?: Record<string, unknown>;
    },
  ): Promise<CompanySettings> {
    return this.repository.update(companyId, data);
  }
}
