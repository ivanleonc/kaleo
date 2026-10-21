import { Module } from '@nestjs/common';
import { BranchController } from './branches.controller.js';
import { BranchService } from './branches.service.js';
import { BranchRepository } from './repositories/branch.repository.js';
import { ExportModule } from '../common/export/export.module.js';

@Module({
  imports: [ExportModule],
  controllers: [BranchController],
  providers: [BranchService, BranchRepository],
  exports: [BranchService],
})
export class BranchesModule {}
