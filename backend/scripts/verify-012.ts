/**
 * Verifica que los índices de la migración 012 existan en la base de datos.
 * Uso: npm run migrate:verify -- development
 */
import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

const EXPECTED_INDEXES = [
  'idx_user_contexts_company_id',
  'idx_user_contexts_role_id',
  'idx_user_contexts_branch_id',
  'idx_users_verification_token',
  'idx_role_permissions_permission_id',
  'idx_roles_name',
];

const environment = process.argv[2] ?? 'development';
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
  const { rows } = await client.query<{ indexname: string }>(
    'SELECT indexname FROM pg_indexes WHERE schemaname = current_schema()',
  );
  const existing = new Set(rows.map((r) => r.indexname));

  let failed = 0;
  for (const name of EXPECTED_INDEXES) {
    const ok = existing.has(name);
    if (!ok) failed++;
    console.log(`${ok ? '✓' : '✗'} ${name}`);
  }

  console.log(`\n[${environment}] ${EXPECTED_INDEXES.length - failed}/${EXPECTED_INDEXES.length} índices presentes.`);
  process.exitCode = failed === 0 ? 0 : 1;
} finally {
  await client.end();
}
