/**
 * Prepara una base PostgreSQL limpia para CI.
 *
 * Supabase crea por defecto el schema `extensions` y los roles `anon`,
 * `authenticated` y `service_role`. Las migraciones del baseline asumen que
 * existen, así que en un PostgreSQL vanilla hay que crearlos antes de migrar.
 *
 * Uso: DATABASE_URL=... npm run db:bootstrap-ci
 */
import 'dotenv/config';
import { Client } from 'pg';
import { databaseSslOptions } from '../src/common/config/database-ssl.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL no está definida');
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: databaseSslOptions(),
});

async function main(): Promise<void> {
  await client.connect();
  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS extensions');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role NOLOGIN;
        END IF;
      END
      $$;
    `);
    console.log('Base CI preparada: schema extensions + roles Supabase');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('ERROR:', (error as Error).message);
  process.exit(1);
});
