/**
 * Configura las contraseñas de los roles de conexión de la aplicación.
 *
 * Uso:
 *   DATABASE_URL=<admin> KALEO_RUNTIME_PASSWORD=... KALEO_AUTH_PASSWORD=... \
 *     npm run db:set-app-passwords
 *
 * `DATABASE_URL` debe ser la conexión administrativa (postgres). No imprime
 * las contraseñas.
 */
import 'dotenv/config';
import { Client } from 'pg';
import { databaseSslOptions } from '../src/common/config/database-ssl.js';

const databaseUrl = process.env.DATABASE_URL;
const runtimePassword = process.env.KALEO_RUNTIME_PASSWORD;
const authPassword = process.env.KALEO_AUTH_PASSWORD;

if (!databaseUrl) throw new Error('DATABASE_URL no está definida');
if (!runtimePassword || !authPassword) {
  throw new Error('Define KALEO_RUNTIME_PASSWORD y KALEO_AUTH_PASSWORD');
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
    await setPassword('kaleo_runtime', runtimePassword!);
    await setPassword('kaleo_auth', authPassword!);
    console.log('Contraseñas actualizadas para kaleo_runtime y kaleo_auth');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('ERROR:', (error as Error).message);
  process.exit(1);
});
