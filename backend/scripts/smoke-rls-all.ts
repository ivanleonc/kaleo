/**
 * Smoke test de RLS completo con el rol kaleo_app.
 *
 * Uso: npm run smoke:rls:all -- staging
 *
 * Crea dos empresas y datos de varios módulos, cambia a kaleo_app con contexto
 * de la empresa A y valida que no vea nada de B. Hace ROLLBACK al final.
 */
import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { databaseSslOptions } from '../src/common/config/database-ssl.js';

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

const client = new Client({ connectionString: databaseUrl, ssl: databaseSslOptions() });

async function count(table: string): Promise<number> {
  const result = await client.query(`SELECT count(*)::int AS n FROM ${table}`);
  return result.rows[0].n as number;
}

async function main(): Promise<void> {
  await client.connect();
  try {
    await client.query('BEGIN');
    const suffix = Date.now();

    const companyA = (await client.query(
      `INSERT INTO companies (name, slug) VALUES ('RLS All A', $1) RETURNING id`,
      [`rls-all-a-${suffix}`],
    )).rows[0].id as string;
    const companyB = (await client.query(
      `INSERT INTO companies (name, slug) VALUES ('RLS All B', $1) RETURNING id`,
      [`rls-all-b-${suffix}`],
    )).rows[0].id as string;
    const userA = (await client.query(
      `INSERT INTO users (email, password_hash, name) VALUES ($1,'x','User A') RETURNING id`,
      [`rls-all-a-${suffix}@example.com`],
    )).rows[0].id as string;
    const userB = (await client.query(
      `INSERT INTO users (email, password_hash, name) VALUES ($1,'x','User B') RETURNING id`,
      [`rls-all-b-${suffix}@example.com`],
    )).rows[0].id as string;
    const branchA = (await client.query(
      `INSERT INTO branches (company_id, name) VALUES ($1,'Sede A') RETURNING id`,
      [companyA],
    )).rows[0].id as string;
    await client.query(
      `INSERT INTO branches (company_id, name) VALUES ($1,'Sede B')`,
      [companyB],
    );
    await client.query(
      `INSERT INTO branches (company_id, name) VALUES ($1,'Sede A2')`,
      [companyA],
    );

    const owner = (await client.query(
      `SELECT id FROM roles WHERE company_id IS NULL AND name='Owner'`,
    )).rows[0].id as string;
    const roleA = (await client.query(
      `INSERT INTO roles (name, company_id) VALUES ('Role A', $1) RETURNING id`,
      [companyA],
    )).rows[0].id as string;
    await client.query(
      `INSERT INTO roles (name, company_id) VALUES ('Role B', $1)`,
      [companyB],
    );

    const membershipA = (await client.query(
      `INSERT INTO memberships (company_id, user_id, status)
       VALUES ($1, $2, 'active') RETURNING id`,
      [companyA, userA],
    )).rows[0].id as string;
    const membershipB = (await client.query(
      `INSERT INTO memberships (company_id, user_id, status)
       VALUES ($1, $2, 'active') RETURNING id`,
      [companyB, userB],
    )).rows[0].id as string;
    await client.query(
      `INSERT INTO membership_roles (company_id, membership_id, role_id) VALUES ($1, $2, $3)`,
      [companyA, membershipA, owner],
    );
    await client.query(
      `INSERT INTO membership_roles (company_id, membership_id, role_id) VALUES ($1, $2, $3)`,
      [companyB, membershipB, owner],
    );

    await client.query(
      `INSERT INTO analyses (company_id, name, analysis_type, result) VALUES ($1,'A','energy','{}'::jsonb)`,
      [companyA],
    );
    await client.query(
      `INSERT INTO analyses (company_id, name, analysis_type, result) VALUES ($1,'B','energy','{}'::jsonb)`,
      [companyB],
    );
    await client.query(
      `INSERT INTO feature_flags (company_id, flag, enabled) VALUES ($1,'a.flag',true)`,
      [companyA],
    );
    await client.query(
      `INSERT INTO feature_flags (company_id, flag, enabled) VALUES ($1,'b.flag',true)`,
      [companyB],
    );
    await client.query(
      `INSERT INTO audit_logs (company_id, action, entity_type, entity_id) VALUES ($1,'TEST','Test',$1)`,
      [companyA],
    );
    await client.query(
      `INSERT INTO audit_logs (company_id, action, entity_type, entity_id) VALUES ($1,'TEST','Test',$1)`,
      [companyB],
    );
    await client.query(
      `INSERT INTO invitations (company_id, email, token_hash, expires_at)
       VALUES ($1,$2,$3,now()+interval '1 day')`,
      [companyA, `inv-a-${suffix}@example.com`, `hash-a-${suffix}`],
    );
    await client.query(
      `INSERT INTO invitations (company_id, email, token_hash, expires_at)
       VALUES ($1,$2,$3,now()+interval '1 day')`,
      [companyB, `inv-b-${suffix}@example.com`, `hash-b-${suffix}`],
    );
    await client.query(
      `INSERT INTO outbox_events (company_id, aggregate_type, event_type) VALUES ($1,'Test','test.event')`,
      [companyA],
    );
    await client.query(
      `INSERT INTO outbox_events (company_id, aggregate_type, event_type) VALUES ($1,'Test','test.event')`,
      [companyB],
    );
    await client.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT $1, id FROM permissions LIMIT 1`,
      [roleA],
    );
    await client.query(
      `INSERT INTO membership_branches (company_id, membership_id, branch_id)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [companyA, membershipA, branchA],
    );

    await client.query('SET LOCAL ROLE kaleo_app');
    await client.query(`SELECT set_config('app.company_id', $1, true)`, [companyA]);
    await client.query(`SELECT set_config('app.user_id', $1, true)`, [userA]);

    const scoped: Record<string, number> = {};
    for (const table of [
      'branches', 'analyses', 'feature_flags', 'audit_logs', 'invitations',
      'outbox_events', 'memberships', 'membership_roles', 'users', 'companies',
    ]) {
      scoped[table] = await count(table);
    }
    const roles = await count('roles');
    const permissions = await count('permissions');
    const rolePermissions = await count('role_permissions');

    await client.query(`SELECT set_config('app.company_id', '', true)`);
    await client.query(`SELECT set_config('app.user_id', '', true)`);
    const noContext = {
      branches: await count('branches'),
      users: await count('users'),
      companies: await count('companies'),
      memberships: await count('memberships'),
    };

    console.table({ scoped, roles, permissions, rolePermissions, noContext });

    const ok =
      scoped.branches === 2 &&
      scoped.analyses === 1 &&
      scoped.feature_flags === 1 &&
      scoped.audit_logs === 1 &&
      scoped.invitations === 1 &&
      scoped.outbox_events === 1 &&
      scoped.memberships === 1 &&
      scoped.membership_roles === 1 &&
      scoped.users === 1 &&
      scoped.companies === 1 &&
      roles === 4 &&
      permissions > 0 &&
      rolePermissions > 0 &&
      noContext.branches === 0 &&
      noContext.users === 0 &&
      noContext.companies === 0 &&
      noContext.memberships === 0;

    console.log(ok ? 'RESULTADO: RLS completo OK' : 'RESULTADO: REVISAR');
    if (!ok) process.exitCode = 1;
  } finally {
    try { await client.query('ROLLBACK'); } catch { /* la transacción pudo abortar */ }
    await client.end();
  }
}

main().catch((error) => {
  console.error('ERROR:', (error as Error).message);
  process.exit(1);
});
