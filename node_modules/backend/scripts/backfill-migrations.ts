/**
 * Registra como aplicadas las migraciones que ya estaban en la base de datos
 * antes de existir este runner. Evita que `npm run migrate` las re-ejecute.
 *
 * Uso: npm run migrate:backfill -- sandbox
 */
import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ALREADY_APPLIED = [
  '000-baseline-schema.sql',
  '002-add-auth-improvements.sql',
  '003-add-rbac-permissions.sql',
  '004-seed-permissions-roles.sql',
  '005-expand-audit-action-column.sql',
  '006-create-branches-table.sql',
  '007-add-permission-name.sql',
  '008-add-audit-response-columns.sql',
  '009-add-audit-indexes.sql',
  '010-cleanup-audit-response-bloat.sql',
  '011-extended-profile-fields.sql',
];

const environment = process.argv[2] ?? 'sandbox';
const envPath = resolve(__dirname, `../.env.${environment}`);
if (!existsSync(envPath)) throw new Error(`No existe ${envPath}`);

const databaseUrl = readFileSync(envPath, 'utf8')
  .split(/\r?\n/)
  .map((line) => line.match(/^DATABASE_URL\s*=\s*(.+)$/)?.[1]?.trim().replace(/^["']|["']$/g, ''))
  .find(Boolean);

if (!databaseUrl) throw new Error(`DATABASE_URL no definido en .env.${environment}`);

const client = new Client({ connectionString: databaseUrl });
await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const version of ALREADY_APPLIED) {
    await client.query(
      'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING',
      [version],
    );
  }

  const { rows } = await client.query<{ version: string }>(
    'SELECT version FROM schema_migrations ORDER BY version',
  );
  console.log(`[${environment}] Registradas ${ALREADY_APPLIED.length} migraciones.`);
  console.log(rows.map((r) => `  ${r.version}`).join('\n'));
} finally {
  await client.end();
}
