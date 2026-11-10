import { Module } from '@nestjs/common';
import { FeatureFlagsController } from './feature-flags.controller.js';
import { FeatureFlagsService } from './feature-flags.service.js';
import { FeatureFlagsRepository } from './feature-flags.repository.js';

@Module({
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService, FeatureFlagsRepository],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
