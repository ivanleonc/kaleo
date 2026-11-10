/**
 * Smoke test del pilot de transacción con RLS.
 *
 * Uso: npm run smoke:tenant -- staging
 *
 * Usa FeatureFlagsRepository + withTenantTransaction contra staging:
 * - contexto A ve solo flags de A;
 * - upsert en A funciona;
 * - query/insert en B queda bloqueada por RLS.
 *
 * Limpia los datos de prueba al final.
 */
import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';
import { databaseSslOptions } from '../src/common/config/database-ssl.js';
import { TenantContextService } from '../src/common/tenancy/tenant-context.service.js';
import { withTenantTransaction } from '../src/common/tenancy/tenant-transaction.js';
import { FeatureFlagsRepository } from '../src/features/feature-flags.repository.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const environment = process.argv[2] ?? 'staging';
const envPath = resolve(__dirname, `../.env.${environment}`);
if (!existsSync(envPath)) throw new Error(`No existe ${envPath}`);

const databaseUrl = readFileSync(envPath, 'utf8')
  .split(/\r?\n/)
  .map((line) => line.match(/^DATABASE_URL\s*=\s*(.+)$/)?.[1])
  .find(Boolean)
  ?.trim()
  .replace(/^["']|["']$/g, '');
if (!databaseUrl) throw new Error(`DATABASE_URL no definido en .env.${environment}`);

const dataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  ssl: databaseSslOptions(),
  synchronize: false,
});

async function main(): Promise<void> {
  await dataSource.initialize();
  const context = new TenantContextService();
  const repository = new FeatureFlagsRepository(dataSource, context);

  const suffix = Date.now();
  let companyA: string | undefined;
  let companyB: string | undefined;

  try {
    companyA = (await dataSource.query(
      `INSERT INTO companies (name, slug) VALUES ('Tenant Pilot A', $1) RETURNING id`,
      [`tenant-pilot-a-${suffix}`],
    ))[0].id;
    companyB = (await dataSource.query(
      `INSERT INTO companies (name, slug) VALUES ('Tenant Pilot B', $1) RETURNING id`,
      [`tenant-pilot-b-${suffix}`],
    ))[0].id;

    await dataSource.query(
      `INSERT INTO feature_flags (company_id, flag, enabled) VALUES ($1, 'a.flag', true), ($2, 'b.flag', true)`,
      [companyA, companyB],
    );

    let crossTenantRead = -1;
    let crossTenantBlocked = false;
    let isolatedRead = false;
    let upsertWorked = false;

    await context.run({ requestId: 'smoke-tenant', isSuperAdmin: false }, async () => {
      context.setCompany(companyA!, undefined);

      const flags = await repository.listByCompany(companyA!);
      isolatedRead = flags.length === 1 && flags[0]!.flag === 'a.flag';

      const updated = await repository.upsert(companyA!, 'a.new', true);
      upsertWorked = updated?.flag === 'a.new' && updated.enabled === true;

      await withTenantTransaction(dataSource, context, async (queryRunner) => {
        const rows = await queryRunner.query(
          `SELECT flag FROM feature_flags WHERE company_id = $1`,
          [companyB],
        );
        crossTenantRead = rows.length;

        try {
          await queryRunner.query(
            `INSERT INTO feature_flags (company_id, flag, enabled) VALUES ($1, 'intruso', true)`,
            [companyB],
          );
        } catch {
          crossTenantBlocked = true;
        }
      });
    });

    const ok = isolatedRead && upsertWorked && crossTenantRead === 0 && crossTenantBlocked;
    console.table([
      ['contexto A ve su flag', isolatedRead],
      ['upsert en A', upsertWorked],
      ['lectura de B desde A', crossTenantRead],
      ['insert cross-tenant bloqueado', crossTenantBlocked],
    ]);
    console.log(ok ? 'RESULTADO: tenant transaction + RLS OK' : 'RESULTADO: REVISAR');
    if (!ok) process.exitCode = 1;
  } finally {
    if (companyA) {
      await dataSource.query(`DELETE FROM feature_flags WHERE company_id = $1`, [companyA]).catch(() => {});
      await dataSource.query(`DELETE FROM companies WHERE id = $1`, [companyA]).catch(() => {});
    }
    if (companyB) {
      await dataSource.query(`DELETE FROM feature_flags WHERE company_id = $1`, [companyB]).catch(() => {});
      await dataSource.query(`DELETE FROM companies WHERE id = $1`, [companyB]).catch(() => {});
    }
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('ERROR:', (error as Error).message);
  process.exit(1);
});
