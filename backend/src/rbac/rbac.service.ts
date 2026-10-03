import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PermissionRepository } from './repositories/permission.repository.js';
import { RoleRepository } from './repositories/role.repository.js';
import { IMMUTABLE_ROLES, PROTECTED_ROLES } from '../common/constants/roles.js';

@Injectable()
export class RbacService {
  constructor(
    private permissionRepository: PermissionRepository,
    private roleRepository: RoleRepository,
  ) {}

  async getAllPermissions() {
    return this.permissionRepository.findAll();
  }

  async getPermissionsByModule(module: string) {
    return this.permissionRepository.findByModule(module);
  }

  async getRolesWithPermissions(companyId: string) {
    return this.roleRepository.getRolesWithPermissions(companyId);
  }

  async getRoleById(id: string, companyId: string) {
    const role = await this.roleRepository.findById(id);
    if (!role) throw new NotFoundException('Rol no encontrado');

    if (role.company_id !== null && role.company_id !== companyId) {
      throw new NotFoundException('Rol no encontrado');
    }

    const permissions = await this.roleRepository.getPermissions(id);
    return { ...role, permissions };
  }

  async createRole(name: string, permissionIds: string[], companyId: string, description?: string, color?: string) {
    const existing = await this.roleRepository.findByName(name, companyId);
    if (existing) throw new ConflictException(`El rol "${name}" ya existe`);

    const role = await this.roleRepository.create(name, companyId, description, color);

    if (permissionIds.length > 0) {
      await this.roleRepository.setPermissions(role.id, permissionIds);
    }

    return { ...role, permissions: await this.roleRepository.getPermissions(role.id) };
  }

  async updateRolePermissions(roleId: string, permissionIds: string[], companyId: string) {
    const role = await this.roleRepository.findById(roleId);
    if (!role) throw new NotFoundException('Rol no encontrado');

    if (IMMUTABLE_ROLES.includes(role.name as any)) {
      throw new ConflictException(`No se pueden modificar los permisos del rol ${role.name}`);
    }

    if (role.company_id !== null && role.company_id !== companyId) {
      throw new ForbiddenException('No tienes acceso a este rol');
    }

    await this.roleRepository.setPermissions(roleId, permissionIds);
    return { ...role, permissions: await this.roleRepository.getPermissions(roleId) };
  }

  async updateRole(roleId: string, data: { name?: string; description?: string; color?: string; permissionIds?: string[] }, companyId: string) {
    const role = await this.roleRepository.findById(roleId);
    if (!role) throw new NotFoundException('Rol no encontrado');

    if (IMMUTABLE_ROLES.includes(role.name as any)) {
      throw new ConflictException(`No se pueden modificar los roles del sistema (${role.name})`);
    }

    if (role.company_id !== null && role.company_id !== companyId) {
      throw new ForbiddenException('No tienes acceso a este rol');
    }

    if (data.name && data.name !== role.name) {
      const existing = await this.roleRepository.findByName(data.name, role.company_id ?? undefined);
      if (existing) throw new ConflictException(`Ya existe un rol con el nombre "${data.name}"`);
    }

    await this.roleRepository.update(roleId, {
      name: data.name,
      description: data.description,
      color: data.color,
    });

    if (data.permissionIds !== undefined) {
      const validIds = data.permissionIds.filter(id => typeof id === 'string' && id.length > 0);
      await this.roleRepository.setPermissions(roleId, validIds);
    }

    const updatedRole = await this.roleRepository.findById(roleId);
    const permissions = await this.roleRepository.getPermissions(roleId);
    return { ...updatedRole, permissions };
  }

  async deleteRole(id: string, companyId: string) {
    const role = await this.roleRepository.findById(id);
    if (!role) throw new NotFoundException('Rol no encontrado');

    if (PROTECTED_ROLES.includes(role.name as any)) {
      throw new ConflictException(`No se pueden eliminar los roles del sistema (${PROTECTED_ROLES.join(', ')})`);
    }

    if (role.company_id !== null && role.company_id !== companyId) {
      throw new ForbiddenException('No tienes acceso a este rol');
    }

    await this.roleRepository.delete(id);
    return { message: `Rol "${role.name}" eliminado correctamente` };
  }

  async getUserPermissions(userId: string, companyId: string) {
    return this.roleRepository.getUserAccess(userId, companyId);
  }
}
