/**
 * Runner de migraciones SQL.
 *
 * Uso:
 *   npm run migrate -- development                     # aplica todas las pendientes
 *   npm run migrate -- staging                         # aplica todas las pendientes
 *   npm run migrate -- production                      # aplica todas las pendientes
 *   npm run migrate -- development 012                 # aplica solo la 012
 *   npm run migrate -- production --status             # solo lista el estado
 *   npm run migrate -- production --backfill-checksums # registra checksums faltantes
 *   npm run migrate -- production --accept-checksum 000 # acepta una edición intencional
 *
 * Elige el DATABASE_URL de `.env.<entorno>`.
 * Registra cada migración aplicada en `schema_migrations` para no repetirlas y
 * guarda un checksum SHA-256 para detectar archivos editados después de aplicar.
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { databaseSslOptions } from '../src/common/config/database-ssl.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, '../src/migrations');

const VALID_ENVIRONMENTS = ['development', 'staging', 'production', 'ci'] as const;
type Environment = (typeof VALID_ENVIRONMENTS)[number];

type Mode = 'apply' | 'status' | 'backfill-checksums' | 'accept-checksum';

function parseArgs(): { environment: Environment; only: string | null; mode: Mode } {
  const [rawEnvironment = 'development', flag, value] = process.argv.slice(2);

  if (!VALID_ENVIRONMENTS.includes(rawEnvironment as Environment)) {
    throw new Error(
      `Entorno inválido: "${rawEnvironment}". Usa uno de: ${VALID_ENVIRONMENTS.join(', ')}`,
    );
  }

  if (flag === '--status') {
    return { environment: rawEnvironment as Environment, only: null, mode: 'status' };
  }

  if (flag === '--backfill-checksums') {
    return { environment: rawEnvironment as Environment, only: null, mode: 'backfill-checksums' };
  }

  if (flag === '--accept-checksum') {
    if (!value || !/^\d/.test(value)) {
      throw new Error('Uso: npm run migrate -- <entorno> --accept-checksum 000');
    }
    return { environment: rawEnvironment as Environment, only: value, mode: 'accept-checksum' };
  }

  const only = flag && /^\d/.test(flag) ? flag : null;
  return { environment: rawEnvironment as Environment, only, mode: 'apply' };
}

function loadDatabaseUrl(environment: Environment): string {
  const envPath = resolve(__dirname, `../.env.${environment}`);
  if (!existsSync(envPath)) {
    throw new Error(`No existe ${envPath}. Crea el archivo antes de migrar.`);
  }

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^DATABASE_URL\s*=\s*(.+)$/);
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  }

  throw new Error(`DATABASE_URL no está definido en .env.${environment}`);
}

function listMigrations(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

function checksumOf(file: string): string {
  return createHash('sha256')
    .update(readFileSync(join(MIGRATIONS_DIR, file)))
    .digest('hex');
}

function stateLabel(isApplied: boolean, stored: string | null | undefined, file: string): string {
  if (!isApplied) return '· pendiente';
  if (stored == null) return '? checksum sin registrar';
  if (stored === checksumOf(file)) return '✓';
  return '! checksum distinto';
}

async function main(): Promise<void> {
  const { environment, only, mode } = parseArgs();
  const client = new Client({
    connectionString: loadDatabaseUrl(environment),
    ssl: databaseSslOptions(),
  });

  await client.connect();
  console.log(`→ Conectado a [${environment}]`);

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      ALTER TABLE schema_migrations
        ADD COLUMN IF NOT EXISTS checksum TEXT
    `);

    const { rows } = await client.query<{ version: string; checksum: string | null }>(
      'SELECT version, checksum FROM schema_migrations',
    );
    const applied = new Map(rows.map((r) => [r.version, r.checksum]));

    const all = listMigrations();
    const pending = all.filter((file) => !applied.has(file));
    const mismatches = all.filter((file) => {
      const stored = applied.get(file);
      return stored != null && stored !== checksumOf(file);
    });

    if (mode === 'status') {
      const appliedCount = all.filter((file) => applied.has(file)).length;
      console.log(`Migraciones aplicadas: ${appliedCount}/${all.length}`);
      for (const file of all) {
        console.log(`  ${stateLabel(applied.has(file), applied.get(file), file)} ${file}`);
      }
      if (mismatches.length > 0) {
        console.log(`\nADVERTENCIA: ${mismatches.length} archivo(s) cambiaron después de aplicarse.`);
        process.exitCode = 1;
      }
      return;
    }

    if (mode === 'backfill-checksums') {
      const missing = all.filter((file) => applied.has(file) && applied.get(file) == null);
      for (const file of missing) {
        await client.query(
          'UPDATE schema_migrations SET checksum = $1 WHERE version = $2',
          [checksumOf(file), file],
        );
      }
      console.log(`Checksums registrados: ${missing.length}`);
      return;
    }

    if (mode === 'accept-checksum') {
      const targets = all.filter((file) => file.startsWith(only!) && applied.has(file));
      if (targets.length === 0) {
        throw new Error(`No hay migraciones aplicadas que empiecen por "${only}".`);
      }
      for (const file of targets) {
        await client.query(
          'UPDATE schema_migrations SET checksum = $1 WHERE version = $2',
          [checksumOf(file), file],
        );
        console.log(`✓ checksum aceptado: ${file}`);
      }
      return;
    }

    if (mismatches.length > 0) {
      throw new Error(
        `Migraciones ya aplicadas con checksum distinto: ${mismatches.join(', ')}. ` +
          'No se aplicará nada. Restaura el archivo o crea una migración nueva.',
      );
    }

    const targets = only
      ? all.filter((file) => file.startsWith(only) && !applied.has(file))
      : pending;

    if (targets.length === 0) {
      console.log('No hay migraciones pendientes.');
      return;
    }

    for (const file of targets) {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`→ Aplicando ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)',
          [file, checksumOf(file)],
        );
        await client.query('COMMIT');
        console.log(`✓ ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`✗ ${file}: ${(error as Error).message}`);
        throw error;
      }
    }

    console.log(`Listo. Aplicadas: ${targets.length}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
