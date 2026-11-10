import { Module } from '@nestjs/common';
import { CompanySettingsController } from './company-settings.controller.js';
import { CompanySettingsRepository } from './company-settings.repository.js';
import { CompanySettingsService } from './company-settings.service.js';

@Module({
  controllers: [CompanySettingsController],
  providers: [CompanySettingsRepository, CompanySettingsService],
  exports: [CompanySettingsService],
})
export class CompanySettingsModule {}
