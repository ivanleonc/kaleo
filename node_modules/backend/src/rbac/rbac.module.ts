import { Module } from '@nestjs/common';
import { RbacController } from './rbac.controller.js';
import { RbacService } from './rbac.service.js';
import { PermissionRepository } from './repositories/permission.repository.js';
import { RoleRepository } from './repositories/role.repository.js';

@Module({
  controllers: [RbacController],
  providers: [RbacService, PermissionRepository, RoleRepository],
  exports: [RbacService, RoleRepository],
})
export class RbacModule {}
