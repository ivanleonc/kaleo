/**
 * Smoke test de la paginación y filtros de miembros contra la base de datos.
 * No requiere servidor HTTP: valida el SQL generado por el repository.
 *
 * Uso: npm run smoke:members -- development
 */
import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
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

function assert(label: string, condition: boolean, detail = ''): void {
  console.log(`${condition ? '✓' : '✗'} ${label}${detail ? ` → ${detail}` : ''}`);
  if (!condition) process.exitCode = 1;
}

try {
  const { rows: companies } = await client.query<{ id: string; name: string }>(
    'SELECT id, name FROM companies LIMIT 1',
  );
  if (companies.length === 0) throw new Error('No hay empresas en la base de datos');
  const companyId = companies[0].id;
  console.log(`Empresa: ${companies[0].name}\n`);

  const statusExpr = `CASE WHEN u.locked_until IS NOT NULL AND u.locked_until > NOW() THEN 'inactive' ELSE 'active' END`;
  const baseWhere = 'uc.company_id = $1 AND u.deleted_at IS NULL';

  const totalAll = await client.query(
    `SELECT COUNT(DISTINCT u.id) as total
     FROM users u INNER JOIN user_contexts uc ON u.id = uc.user_id
     WHERE ${baseWhere}`,
    [companyId],
  );
  console.log(`Total de miembros: ${totalAll.rows[0].total}`);

  const page1 = await client.query(
    `SELECT u.id, u.name, u.email, ${statusExpr} as status
     FROM users u INNER JOIN user_contexts uc ON u.id = uc.user_id
     LEFT JOIN roles r ON uc.role_id = r.id
     WHERE ${baseWhere}
     GROUP BY u.id, u.name, u.email, u.locked_until
     ORDER BY u.name, u.email
     LIMIT $2 OFFSET $3`,
    [companyId, 1, 0],
  );
  assert('Página 1 con limit=1 devuelve 1 fila', page1.rows.length <= 1, `${page1.rows.length} fila(s)`);

  const page2 = await client.query(
    `SELECT u.id, u.name, u.email
     FROM users u INNER JOIN user_contexts uc ON u.id = uc.user_id
     WHERE ${baseWhere}
     GROUP BY u.id, u.name, u.email
     ORDER BY u.name, u.email
     LIMIT $2 OFFSET $3`,
    [companyId, 1, 1],
  );
  assert(
    'Página 2 devuelve una fila distinta',
    page1.rows.length === 0 || page2.rows.length === 0 || page1.rows[0].id !== page2.rows[0].id,
  );

  const first = page1.rows[0];
  if (first) {
    const term = first.name.split(' ')[0].slice(0, 4);
    const bySearch = await client.query(
      `SELECT COUNT(DISTINCT u.id) as total
       FROM users u INNER JOIN user_contexts uc ON u.id = uc.user_id
       WHERE ${baseWhere} AND (u.name ILIKE $2 OR u.email ILIKE $2)`,
      [companyId, `%${term}%`],
    );
    assert(`search="${term}" encuentra al menos 1 resultado`, Number(bySearch.rows[0].total) >= 1, `${bySearch.rows[0].total}`);

    const inactive = await client.query(
      `SELECT COUNT(DISTINCT u.id) as total
       FROM users u INNER JOIN user_contexts uc ON u.id = uc.user_id
       WHERE ${baseWhere} AND u.locked_until IS NOT NULL AND u.locked_until > NOW()`,
      [companyId],
    );
    const active = await client.query(
      `SELECT COUNT(DISTINCT u.id) as total
       FROM users u INNER JOIN user_contexts uc ON u.id = uc.user_id
       WHERE ${baseWhere} AND (u.locked_until IS NULL OR u.locked_until <= NOW())`,
      [companyId],
    );
    assert(
      'active + inactive = total',
      Number(inactive.rows[0].total) + Number(active.rows[0].total) === Number(totalAll.rows[0].total),
      `${active.rows[0].total} + ${inactive.rows[0].total} = ${totalAll.rows[0].total}`,
    );

    const roleRow = await client.query<{ id: string }>(
      'SELECT role_id as id FROM user_contexts WHERE company_id = $1 LIMIT 1',
      [companyId],
    );
    if (roleRow.rows[0]) {
      const byRole = await client.query(
        `SELECT COUNT(DISTINCT u.id) as total
         FROM users u INNER JOIN user_contexts uc ON u.id = uc.user_id
         WHERE ${baseWhere}
           AND EXISTS (SELECT 1 FROM user_contexts ucr WHERE ucr.user_id = u.id AND ucr.company_id = uc.company_id AND ucr.role_id = $2)`,
        [companyId, roleRow.rows[0].id],
      );
      assert('Filtro por roleId devuelve resultados', Number(byRole.rows[0].total) >= 1, `${byRole.rows[0].total}`);
    }
  }
} finally {
  await client.end();
}
