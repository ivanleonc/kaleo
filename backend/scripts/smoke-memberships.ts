/**
 * Smoke test del modelo de memberships (memberships, roles y sedes).
 *
 * Uso: npm run smoke:memberships -- staging
 *
 * Valida el alta, la asignación de roles/sedes y el borrado en cascada.
 * Todo ocurre en una transacción con ROLLBACK: no deja datos.
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

async function counts(companyId: string) {
  const result = await client.query(
    `SELECT
       (SELECT count(*)::int FROM memberships WHERE company_id = $1) AS memberships,
       (SELECT count(*)::int FROM membership_roles WHERE company_id = $1) AS roles,
       (SELECT count(*)::int FROM membership_branches WHERE company_id = $1) AS branches`,
    [companyId],
  );
  return result.rows[0] as { memberships: number; roles: number; branches: number };
}

async function main(): Promise<void> {
  await client.connect();
  try {
    await client.query('BEGIN');
    const suffix = Date.now();
    const company = (await client.query(
      `INSERT INTO companies (name, slug) VALUES ('Membership Smoke', $1) RETURNING id`,
      [`membership-smoke-${suffix}`],
    )).rows[0].id as string;
    const user = (await client.query(
      `INSERT INTO users (email, password_hash, name) VALUES ($1, 'x', 'Membership Smoke') RETURNING id`,
      [`membership-smoke-${suffix}@example.com`],
    )).rows[0].id as string;
    const branch = (await client.query(
      `INSERT INTO branches (company_id, name) VALUES ($1, 'Sede Smoke') RETURNING id`,
      [company],
    )).rows[0].id as string;
    const roles = await client.query(
      `SELECT id, name FROM roles WHERE company_id IS NULL AND name IN ('Owner','Viewer')`,
    );
    const owner = roles.rows.find((r) => r.name === 'Owner').id as string;
    const viewer = roles.rows.find((r) => r.name === 'Viewer').id as string;

    const membership = (await client.query(
      `INSERT INTO memberships (company_id, user_id, status)
       VALUES ($1, $2, 'active')
       RETURNING id`,
      [company, user],
    )).rows[0].id as string;

    await client.query(
      `INSERT INTO membership_roles (company_id, membership_id, role_id)
       VALUES ($1, $2, $3), ($1, $2, $4)`,
      [company, membership, owner, viewer],
    );
    await client.query(
      `INSERT INTO membership_branches (company_id, membership_id, branch_id)
       VALUES ($1, $2, $3)`,
      [company, membership, branch],
    );

    const afterInsert = await counts(company);

    await client.query(
      `DELETE FROM membership_roles WHERE company_id = $1 AND membership_id = $2 AND role_id = $3`,
      [company, membership, viewer],
    );
    const afterOneRoleDelete = await counts(company);

    await client.query(`DELETE FROM memberships WHERE company_id = $1 AND id = $2`, [company, membership]);
    const afterMembershipDelete = await counts(company);

    console.table({ afterInsert, afterOneRoleDelete, afterMembershipDelete });

    const ok =
      afterInsert.memberships === 1 &&
      afterInsert.roles === 2 &&
      afterInsert.branches === 1 &&
      afterOneRoleDelete.memberships === 1 &&
      afterOneRoleDelete.roles === 1 &&
      afterMembershipDelete.memberships === 0 &&
      afterMembershipDelete.roles === 0 &&
      afterMembershipDelete.branches === 0;

    console.log(ok ? 'RESULTADO: memberships OK' : 'RESULTADO: REVISAR');
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
