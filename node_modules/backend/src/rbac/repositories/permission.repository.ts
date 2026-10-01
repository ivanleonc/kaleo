import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class PermissionRepository {
  constructor(private dataSource: DataSource) {}

  async findAll() {
    return this.dataSource.query(
      `SELECT id, code, name, module FROM permissions ORDER BY module, code`,
    );
  }

  async findByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    return this.dataSource.query(
      `SELECT id, code, name, module FROM permissions WHERE id IN (${placeholders})`,
      ids,
    );
  }

  async findByModule(module: string) {
    return this.dataSource.query(
      `SELECT id, code, name, module FROM permissions WHERE module = $1 ORDER BY code`,
      [module],
    );
  }
}
