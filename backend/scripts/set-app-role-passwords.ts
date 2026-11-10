/**
 * Configura las contraseñas de los roles de conexión de la aplicación.
 *
 * Uso:
 *   KALEO_RUNTIME_PASSWORD=... KALEO_AUTH_PASSWORD=... \
 *     npm run db:set-app-passwords -- production
 *
 * `DATABASE_URL` se toma SIEMPRE de `.env.<entorno>` para evitar escribir en
 * la base local por accidente. No imprime contraseñas.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { databaseSslOptions } from '../src/common/config/database-ssl.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const environment = process.argv[2] ?? 'production';
const envPath = resolve(__dirname, `../.env.${environment}`);

function databaseUrlFromFile(): string | undefined {
  if (!existsSync(envPath)) return undefined;
  return readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^DATABASE_URL\s*=\s*(.+)$/)?.[1])
    .find(Boolean)
    ?.trim()
    .replace(/^["']|["']$/g, '');
}

const databaseUrl = databaseUrlFromFile() ?? process.env.DATABASE_URL;
const runtimePassword = process.env.KALEO_RUNTIME_PASSWORD;
const authPassword = process.env.KALEO_AUTH_PASSWORD;

if (!databaseUrl) throw new Error(`DATABASE_URL no definida para "${environment}"`);
if (!runtimePassword || !authPassword) {
  throw new Error('Define KALEO_RUNTIME_PASSWORD y KALEO_AUTH_PASSWORD');
}

function describeTarget(url: string): string {
  const parsed = new URL(url);
  return `${parsed.username}@${parsed.hostname}:${parsed.port || '(default)'}${parsed.pathname}`;
}

const client = new Client({ connectionString: databaseUrl, ssl: databaseSslOptions() });

async function setPassword(role: string, password: string) {
  const quoted = await client.query('SELECT quote_literal($1) AS value', [password]);
  const literal = quoted.rows[0].value as string;
  await client.query(`ALTER ROLE ${role} PASSWORD ${literal}`);
}

async function main(): Promise<void> {
  await client.connect();
  try {
    console.log(`→ Conectado a [${environment}]: ${describeTarget(databaseUrl!)}`);

    const roles = await client.query<{
      rolname: string;
      rolcanlogin: boolean;
      rolbypassrls: boolean;
    }>(
      `SELECT rolname, rolcanlogin, rolbypassrls
       FROM pg_roles
       WHERE rolname IN ('kaleo_runtime', 'kaleo_auth')`,
    );

    const names = new Set(roles.rows.map((r) => r.rolname));
    if (!names.has('kaleo_runtime') || !names.has('kaleo_auth')) {
      throw new Error(
        'Faltan los roles kaleo_runtime/kaleo_auth. Aplica la migración 039 primero.',
      );
    }

    await setPassword('kaleo_runtime', runtimePassword!);
    await setPassword('kaleo_auth', authPassword!);

    console.log('Contraseñas actualizadas para kaleo_runtime y kaleo_auth');
    console.log('Siguiente paso: npm run db:check-app-roles -- ' + environment);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('ERROR:', (error as Error).message);
  process.exit(1);
});
