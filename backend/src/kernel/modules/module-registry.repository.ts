import { ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { runInTransaction } from '../../common/utils/transaction.helper.js';
import { withTenantTransaction } from '../../common/tenancy/tenant-transaction.js';
import { TenantContextService } from '../../common/tenancy/tenant-context.service.js';
import type { ModuleManifest, ModuleStatus } from './module-manifest.types.js';

@Injectable()
export class ModuleRegistryRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
    @Optional() @InjectDataSource('auth') private readonly authDataSource?: DataSource,
  ) {}

  private get privilegedDataSource(): DataSource {
    return this.authDataSource ?? this.dataSource;
  }

  private assertCompany(companyId: string): void {
    if (this.tenantContext.requireCompanyId() !== companyId) {
      throw new ForbiddenException('La empresa no coincide con el TenantContext');
    }
  }

  /** Sincroniza los manifests en código con el catálogo de la base. */
  async syncCatalog(manifests: ModuleManifest[]): Promise<void> {
    await runInTransaction(this.privilegedDataSource, async (queryRunner) => {
      for (const manifest of manifests) {
        await queryRunner.query(
          `INSERT INTO modules (code, name, vertical, version, is_core, status)
           VALUES ($1, $2, $3, $4, $5, 'active')
           ON CONFLICT (code) DO UPDATE SET
             name = EXCLUDED.name,
             vertical = EXCLUDED.vertical,
             version = EXCLUDED.version,
             is_core = EXCLUDED.is_core,
             status = EXCLUDED.status`,
          [
            manifest.code,
            manifest.name,
            manifest.vertical,
            manifest.version,
            manifest.isCore,
          ],
        );
      }

      const codes = manifests.map((manifest) => manifest.code);
      await queryRunner.query(
        `DELETE FROM module_dependencies WHERE module_code = ANY($1::text[])`,
        [codes],
      );

      const dependencies = manifests.flatMap((manifest) =>
        manifest.dependsOn.map((dependency) => [manifest.code, dependency] as const),
      );
      if (dependencies.length > 0) {
        const values = dependencies
          .map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`)
          .join(', ');
        await queryRunner.query(
          `INSERT INTO module_dependencies (module_code, depends_on_module_code)
           VALUES ${values}
           ON CONFLICT DO NOTHING`,
          dependencies.flat(),
        );
      }

      await queryRunner.query(
        `UPDATE ai_tools SET is_active = FALSE WHERE module_code = ANY($1::text[])`,
        [codes],
      );

      const aiTools = manifests.flatMap((manifest) =>
        (manifest.aiTools ?? []).map((tool) => ({ ...tool, moduleCode: manifest.code })),
      );
      for (const tool of aiTools) {
        await queryRunner.query(
          `INSERT INTO ai_tools
             (code, module_code, name, description, risk, requires_confirmation,
              permission, input_schema, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, TRUE)
           ON CONFLICT (code) DO UPDATE SET
             module_code = EXCLUDED.module_code,
             name = EXCLUDED.name,
             description = EXCLUDED.description,
             risk = EXCLUDED.risk,
             requires_confirmation = EXCLUDED.requires_confirmation,
             permission = EXCLUDED.permission,
             input_schema = EXCLUDED.input_schema,
             is_active = TRUE,
             updated_at = now()`,
          [
            tool.code,
            tool.moduleCode,
            tool.name,
            tool.description ?? null,
            tool.risk,
            tool.requiresConfirmation,
            tool.permission ?? null,
            JSON.stringify(tool.inputSchema ?? {}),
          ],
        );
      }
    });
  }

  /** Estado de los módulos habilitados explícitamente para una empresa. */
  async getCompanyModuleStatuses(companyId: string): Promise<Map<string, ModuleStatus>> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = await queryRunner.query(
        `SELECT module_code, status
         FROM company_modules
         WHERE company_id = $1`,
        [companyId],
      );
      return new Map<string, ModuleStatus>(
        rows.map((row: { module_code: string; status: ModuleStatus }) => [
          row.module_code,
          row.status,
        ]),
      );
    });
  }

  async setCompanyModule(
    companyId: string,
    moduleCode: string,
    enabled: boolean,
  ): Promise<ModuleStatus> {
    this.assertCompany(companyId);
    const status: ModuleStatus = enabled ? 'enabled' : 'disabled';

    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = await queryRunner.query(
        `INSERT INTO company_modules
           (company_id, module_code, status, enabled_at, disabled_at)
         VALUES ($1, $2, $3,
           CASE WHEN $3 = 'enabled' THEN now() ELSE NULL END,
           CASE WHEN $3 = 'disabled' THEN now() ELSE NULL END)
         ON CONFLICT (company_id, module_code) DO UPDATE SET
           status = EXCLUDED.status,
           enabled_at = CASE WHEN EXCLUDED.status = 'enabled' THEN now() ELSE company_modules.enabled_at END,
           disabled_at = CASE WHEN EXCLUDED.status = 'disabled' THEN now() ELSE NULL END
         RETURNING status`,
        [companyId, moduleCode, status],
      );
      return rows[0]?.status as ModuleStatus;
    });
  }

  async getModuleConfig(
    companyId: string,
    moduleCode: string,
  ): Promise<Record<string, unknown>> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = await queryRunner.query(
        `SELECT config FROM company_modules
         WHERE company_id = $1 AND module_code = $2`,
        [companyId, moduleCode],
      );
      return (rows[0]?.config as Record<string, unknown>) ?? {};
    });
  }

  async setModuleConfig(
    companyId: string,
    moduleCode: string,
    config: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = await queryRunner.query(
        `INSERT INTO company_modules
           (company_id, module_code, status, enabled_at, config)
         VALUES ($1, $2, 'enabled', now(), $3::jsonb)
         ON CONFLICT (company_id, module_code)
         DO UPDATE SET config = EXCLUDED.config
         RETURNING config`,
        [companyId, moduleCode, JSON.stringify(config)],
      );
      return (rows[0]?.config as Record<string, unknown>) ?? {};
    });
  }
}
