/**
 * Smoke test de auditoría transaccional + outbox.
 *
 * Uso: npm run smoke:outbox -- staging
 *
 * Crea una empresa de prueba, escribe auditoría y un evento outbox dentro de
 * la misma transacción, publica el outbox y limpia todo al final.
 */
import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';
import { databaseSslOptions } from '../src/common/config/database-ssl.js';
import { CompanyRepository } from '../src/company/repositories/company.repository.js';
import { AuditLogRepository } from '../src/audit/audit-log.repository.js';
import { OutboxService } from '../src/outbox/outbox.service.js';

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
  const companyRepository = new CompanyRepository(dataSource);
  const auditRepository = new AuditLogRepository(dataSource);
  const outbox = new OutboxService(dataSource);

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let userId: string | undefined;
  let companyId: string | undefined;

  try {
    const userRows = await dataSource.query(
      `INSERT INTO users (email, password_hash, name, must_change_password, email_verified)
       VALUES ($1, 'smoke', 'Smoke Outbox', FALSE, TRUE)
       RETURNING id`,
      [`smoke-outbox-${suffix}@example.com`],
    );
    userId = userRows[0].id as string;

    const company = await companyRepository.createWithOwner(
      userId,
      'Smoke Outbox Co',
      undefined,
      `smoke-outbox-${suffix}`,
      async (queryRunner, created) => {
        await auditRepository.logInTransaction(queryRunner, {
          companyId: created.id,
          userId,
          action: 'SMOKE company.created',
          entityType: 'Company',
          entityId: created.id,
          newValues: { name: created.name, slug: created.slug },
          responseStatus: 201,
          moduleCode: 'core.tenancy',
          source: 'api',
          requestId: `smoke-${suffix}`,
          actorType: 'user',
          actorId: userId,
        });
        await outbox.enqueue(
          {
            companyId: created.id,
            aggregateType: 'Company',
            aggregateId: created.id,
            eventType: 'company.created',
            payload: { name: created.name, slug: created.slug },
          },
          queryRunner,
        );
      },
    );
    companyId = company!.id;

    const audit = await dataSource.query(
      `SELECT count(*)::int AS n FROM audit_logs WHERE company_id = $1 AND action = 'SMOKE company.created'`,
      [companyId],
    );
    const outboxRows = await dataSource.query(
      `SELECT count(*)::int AS n FROM outbox_events WHERE company_id = $1`,
      [companyId],
    );
    const membership = await dataSource.query(
      `SELECT
         (SELECT count(*)::int FROM memberships WHERE company_id = $1) AS memberships,
         (SELECT count(*)::int FROM membership_roles WHERE company_id = $1) AS roles,
         (SELECT count(*)::int FROM user_contexts WHERE company_id = $1) AS contexts`,
      [companyId],
    );

    const published = await outbox.publishPending();
    const pending = await dataSource.query(
      `SELECT count(*)::int AS n FROM outbox_events WHERE company_id = $1 AND published_at IS NULL`,
      [companyId],
    );

    const membershipCounts = membership[0];
    const ok =
      audit[0].n === 1 &&
      outboxRows[0].n === 1 &&
      pending[0].n === 0 &&
      membershipCounts.memberships === 1 &&
      membershipCounts.roles === 1 &&
      membershipCounts.contexts === 1;
    console.table([
      ['audit_logs', audit[0].n],
      ['outbox_events', outboxRows[0].n],
      ['eventos publicados en esta corrida', published],
      ['outbox pendientes', pending[0].n],
      ['memberships', membershipCounts.memberships],
      ['membership_roles', membershipCounts.roles],
      ['user_contexts (legacy)', membershipCounts.contexts],
    ]);
    console.log(ok ? 'RESULTADO: auditoría transaccional + outbox OK' : 'RESULTADO: REVISAR');
    if (!ok) process.exitCode = 1;
  } finally {
    if (companyId) {
      await dataSource.query(`DELETE FROM audit_logs WHERE company_id = $1`, [companyId]).catch(() => {});
      await dataSource.query(`DELETE FROM outbox_events WHERE company_id = $1`, [companyId]).catch(() => {});
      await dataSource.query(`DELETE FROM user_contexts WHERE company_id = $1`, [companyId]).catch(() => {});
      await dataSource.query(`DELETE FROM companies WHERE id = $1`, [companyId]).catch(() => {});
    }
    if (userId) {
      await dataSource.query(`DELETE FROM users WHERE id = $1`, [userId]).catch(() => {});
    }
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('ERROR:', (error as Error).message);
  process.exit(1);
});
