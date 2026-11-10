/**
 * Smoke test del piloto RLS.
 *
 * Uso: npm run smoke:rls -- staging
 *
 * Crea dos empresas y dos sedes dentro de una transacción, cambia a
 * `kaleo_app`, valida el aislamiento y hace ROLLBACK. No deja datos.
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
if (!existsSync(envPath)) {
  throw new Error(`No existe ${envPath}. Crea el archivo antes de ejecutar el smoke test.`);
}

const databaseUrl = readFileSync(envPath, 'utf8')
  .split(/\r?\n/)
  .map((line) => line.match(/^DATABASE_URL\s*=\s*(.+)$/)?.[1])
  .find(Boolean)
  ?.trim()
  .replace(/^["']|["']$/g, '');
if (!databaseUrl) {
  throw new Error(`DATABASE_URL no definido en .env.${environment}`);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: databaseSslOptions(),
});

async function main(): Promise<void> {
  await client.connect();
  try {
    await client.query('BEGIN');
    const suffix = Date.now();
    const companyA = (await client.query(
      `INSERT INTO companies (name, slug) VALUES ($1, $2) RETURNING id`,
      ['RLS Smoke A', `rls-smoke-a-${suffix}`],
    )).rows[0].id as string;
    const companyB = (await client.query(
      `INSERT INTO companies (name, slug) VALUES ($1, $2) RETURNING id`,
      ['RLS Smoke B', `rls-smoke-b-${suffix}`],
    )).rows[0].id as string;

    await client.query(`INSERT INTO branches (company_id, name) VALUES ($1, 'Sede A')`, [companyA]);
    await client.query(`INSERT INTO branches (company_id, name) VALUES ($1, 'Sede B')`, [companyB]);

    await client.query('SET LOCAL ROLE kaleo_app');
    const currentUser = (await client.query('SELECT current_user')).rows[0].current_user as string;

    await client.query(`SELECT set_config('app.company_id', $1, true)`, [companyA]);
    const namesA = (await client.query('SELECT name FROM branches ORDER BY name')).rows.map((r) => r.name as string);

    await client.query(`SELECT set_config('app.company_id', $1, true)`, [companyB]);
    const namesB = (await client.query('SELECT name FROM branches ORDER BY name')).rows.map((r) => r.name as string);

    await client.query('RESET app.company_id');
    const withoutContext = (await client.query('SELECT count(*)::int AS n FROM branches')).rows[0].n as number;

    await client.query(`SELECT set_config('app.company_id', $1, true)`, [companyA]);
    await client.query('SAVEPOINT cross_tenant');
    let blocked = false;
    let errorMessage = '';
    try {
      await client.query(`INSERT INTO branches (company_id, name) VALUES ($1, 'Intruso')`, [companyB]);
    } catch (error) {
      blocked = true;
      errorMessage = (error as Error).message;
      await client.query('ROLLBACK TO SAVEPOINT cross_tenant');
    }

    const ok =
      currentUser === 'kaleo_app' &&
      JSON.stringify(namesA) === JSON.stringify(['Sede A']) &&
      JSON.stringify(namesB) === JSON.stringify(['Sede B']) &&
      withoutContext === 0 &&
      blocked;

    console.table([
      ['current_user', currentUser],
      ['empresa A ve', namesA.join(', ') || '(nada)'],
      ['empresa B ve', namesB.join(', ') || '(nada)'],
      ['sin app.company_id', `${withoutContext} filas`],
      ['INSERT cross-tenant', blocked ? 'bloqueado' : 'PERMITIDO'],
      ...(errorMessage ? [['error', errorMessage]] : []),
    ]);

    console.log(ok ? 'RESULTADO: RLS OK' : 'RESULTADO: REVISAR');
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
