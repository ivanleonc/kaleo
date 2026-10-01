/**
 * Crea miembros temporales en la empresa de sandbox para validar la paginación
 * y los filtros con un volumen realista. Se puede revertir con --clean.
 *
 * Uso: npm run smoke:seed -- sandbox [--clean]
 */
import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const environment = process.argv[2] ?? 'sandbox';
const clean = process.argv.includes('--clean');
const MARKER = 'smoke.pagination@';

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
  const { rows: companies } = await client.query<{ id: string; name: string }>(
    'SELECT id, name FROM companies LIMIT 1',
  );
  if (companies.length === 0) throw new Error('No hay empresas en la base de datos');
  const companyId = companies[0].id;
  console.log(`Empresa: ${companies[0].name}`);

  const { rows: removed } = await client.query(
    `DELETE FROM users WHERE email LIKE $1 RETURNING id`,
    [`%${MARKER}%`],
  );
  console.log(`Usuarios de prueba eliminados: ${removed.length}`);

  if (clean) {
    console.log('Listo (--clean).');
    process.exit(0);
  }

  const { rows: roles } = await client.query<{ id: string; name: string }>(
    `SELECT id, name FROM roles WHERE company_id IS NULL AND deleted_at IS NULL ORDER BY name LIMIT 1`,
  );
  if (roles.length === 0) throw new Error('No hay roles globales disponibles');
  const roleId = roles[0].id;
  console.log(`Rol: ${roles[0].name}`);

  const TOTAL = 27;
  for (let i = 1; i <= TOTAL; i++) {
    const email = `${MARKER}${String(i).padStart(2, '0')}@example.com`;
    const user = await client.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, name, email_verified)
       VALUES ($1, 'x', $2, TRUE)
       RETURNING id`,
      [email, `Smoke Test ${String(i).padStart(2, '0')}`],
    );
    await client.query(
      `INSERT INTO user_contexts (user_id, company_id, role_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [user.rows[0].id, companyId, roleId],
    );
  }

  const { rows: total } = await client.query(
    'SELECT COUNT(*) as total FROM users WHERE email LIKE $1',
    [`%${MARKER}%`],
  );
  console.log(`Miembros de prueba creados: ${total[0].total}`);
} finally {
  await client.end();
}
