import { Injectable } from '@nestjs/common';
import { FeatureFlagsRepository } from './feature-flags.repository.js';
import type { FeatureFlagRow } from '../common/types/db-rows.js';

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly repository: FeatureFlagsRepository) {}

  /**
   * Devuelve false si falta empresa o flag: un flag desconocido nunca debe
   * habilitar una capacidad por accidente.
   */
  async isEnabled(companyId: string, flag: string): Promise<boolean> {
    if (!companyId || !flag) return false;
    return this.repository.isEnabled(companyId, flag);
  }

  async list(companyId: string): Promise<FeatureFlagRow[]> {
    if (!companyId) return [];
    return this.repository.listByCompany(companyId);
  }

  /** Mapa plano para que el frontend consuma los flags de una sola vez. */
  async enabledMap(companyId: string): Promise<Record<string, boolean>> {
    const flags = await this.list(companyId);
    return Object.fromEntries(flags.map((flag) => [flag.flag, flag.enabled]));
  }

  async set(
    companyId: string,
    flag: string,
    enabled: boolean,
    description?: string | null,
  ): Promise<FeatureFlagRow | undefined> {
    return this.repository.upsert(companyId, flag, enabled, description);
  }
}
