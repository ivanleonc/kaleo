/**
 * Runner de migraciones SQL.
 *
 * Uso:
 *   npm run migrate -- sandbox              # aplica todas las pendientes
 *   npm run migrate -- sandbox 012          # aplica solo la 012
 *   npm run migrate -- sandbox --status     # solo lista el estado
 *
 * Elige el DATABASE_URL de `.env.<entorno>` (sandbox | staging | prod).
 * Registra cada migración aplicada en `schema_migrations` para no repetirlas.
 */
import 'dotenv/config';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, '../src/migrations');

const VALID_ENVIRONMENTS = ['sandbox', 'staging', 'prod'] as const;
type Environment = (typeof VALID_ENVIRONMENTS)[number];

function parseArgs(): { environment: Environment; only: string | null; status: boolean } {
  const [rawEnvironment = 'sandbox', prefix, suffix] = process.argv.slice(2);

  if (!VALID_ENVIRONMENTS.includes(rawEnvironment as Environment)) {
    throw new Error(
      `Entorno inválido: "${rawEnvironment}". Usa uno de: ${VALID_ENVIRONMENTS.join(', ')}`,
    );
  }

  if (prefix === '--status') {
    return { environment: rawEnvironment as Environment, only: null, status: true };
  }

  const only = prefix && /^\d/.test(prefix) ? prefix : null;
  return { environment: rawEnvironment as Environment, only, status: false };
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

async function main(): Promise<void> {
  const { environment, only, status } = parseArgs();
  const client = new Client({ connectionString: loadDatabaseUrl(environment) });

  await client.connect();
  console.log(`→ Conectado a [${environment}]`);

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows } = await client.query<{ version: string }>('SELECT version FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.version));

    const all = listMigrations();
    const pending = all.filter((file) => !applied.has(file));

    if (status) {
      console.log(`Migraciones aplicadas: ${applied.size}/${all.length}`);
      for (const file of all) {
        console.log(`  ${applied.has(file) ? '✓' : '·'} ${file}`);
      }
      return;
    }

    const targets = only ? all.filter((f) => f.startsWith(only)) : pending;

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
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
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
