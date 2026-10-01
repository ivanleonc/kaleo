import { Module } from '@nestjs/common';
import { BranchController } from './branches.controller.js';
import { BranchService } from './branches.service.js';
import { BranchRepository } from './repositories/branch.repository.js';

@Module({
  controllers: [BranchController],
  providers: [BranchService, BranchRepository],
  exports: [BranchService],
})
export class BranchesModule {}
