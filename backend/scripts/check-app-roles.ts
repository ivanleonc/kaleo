/**
 * Verifica las conexiones kaleo_runtime y kaleo_auth antes de activarlas en
 * Render.
 *
 * Uso:
 *   KALEO_RUNTIME_PASSWORD=... KALEO_AUTH_PASSWORD=... \
 *     npm run db:check-app-roles -- production
 *
 * Deriva las URLs desde `DATABASE_URL` de `.env.<entorno>`:
 * - pooler: `postgres.<ref>` -> `kaleo_runtime.<ref>`
 * - directo: `postgres`      -> `kaleo_runtime`
 *
 * No imprime contraseñas.
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

const adminUrl = databaseUrlFromFile() ?? process.env.DATABASE_URL;
const runtimePassword = process.env.KALEO_RUNTIME_PASSWORD;
const authPassword = process.env.KALEO_AUTH_PASSWORD;

if (!adminUrl) throw new Error(`DATABASE_URL no definida para "${environment}"`);
if (!runtimePassword || !authPassword) {
  throw new Error('Define KALEO_RUNTIME_PASSWORD y KALEO_AUTH_PASSWORD');
}

function roleUrl(role: string, password: string): string {
  const url = new URL(adminUrl!);
  const dot = url.username.indexOf('.');
  const suffix = dot >= 0 ? url.username.slice(dot + 1) : '';
  url.username = suffix ? `${role}.${suffix}` : role;
  url.password = password;
  return url.toString();
}

async function withClient<T>(url: string, fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: url, ssl: databaseSslOptions() });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  const failures: string[] = [];
  const check = (label: string, ok: boolean, detail: string) => {
    console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` → ${detail}` : ''}`);
    if (!ok) failures.push(label);
  };

  const roleState = await withClient(adminUrl!, async (client) => {
    const result = await client.query<{
      rolname: string;
      rolcanlogin: boolean;
      rolbypassrls: boolean;
    }>(
      `SELECT rolname, rolcanlogin, rolbypassrls
       FROM pg_roles
       WHERE rolname IN ('kaleo_runtime', 'kaleo_auth')`,
    );
    return result.rows;
  });

  for (const role of roleState) {
    if (role.rolname === 'kaleo_runtime') {
      check(
        'kaleo_runtime existe, login, sin BYPASSRLS',
        role.rolcanlogin && !role.rolbypassrls,
        '',
      );
    }
    if (role.rolname === 'kaleo_auth') {
      check(
        'kaleo_auth existe, login, con BYPASSRLS',
        role.rolcanlogin && role.rolbypassrls,
        '',
      );
    }
  }

  const runtimeUrl = roleUrl('kaleo_runtime', runtimePassword!);
  const authUrl = roleUrl('kaleo_auth', authPassword!);

  const masked = (value: string) => {
    const url = new URL(value);
    url.password = '***';
    return url.toString();
  };
  console.log(`Runtime: ${masked(runtimeUrl)}`);
  console.log(`Auth:    ${masked(authUrl)}`);

  const runtime = await withClient(runtimeUrl, async (client) => {
    const who = await client.query<{ user: string }>('SELECT current_user AS user');
    const noContext = await client.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM memberships',
    );
    return { user: who.rows[0]?.user, membershipsWithoutContext: noContext.rows[0]?.n ?? 0 };
  });

  check('kaleo_runtime se conecta', runtime.user === 'kaleo_runtime', runtime.user ?? 'sin usuario');
  check(
    'RLS falla cerrado sin company_id',
    runtime.membershipsWithoutContext === 0,
    `${runtime.membershipsWithoutContext} membership(s)`,
  );

  const auth = await withClient(authUrl, async (client) => {
    const who = await client.query<{ user: string }>('SELECT current_user AS user');
    const sample = await client.query<{ company_id: string }>(
      'SELECT company_id FROM memberships LIMIT 1',
    );
    const counts = await client.query<{ users: number }>(
      'SELECT count(*)::int AS users FROM users',
    );
    return {
      user: who.rows[0]?.user,
      companyId: sample.rows[0]?.company_id,
      users: counts.rows[0]?.users ?? 0,
    };
  });

  check('kaleo_auth se conecta', auth.user === 'kaleo_auth', auth.user ?? 'sin usuario');
  check('kaleo_auth lee usuarios (BYPASSRLS)', auth.users >= 0, `${auth.users} usuario(s)`);

  if (auth.companyId) {
    const scoped = await withClient(runtimeUrl, async (client) => {
      await client.query('BEGIN');
      try {
        await client.query('SET LOCAL ROLE kaleo_app');
        await client.query(`SELECT set_config('app.company_id', $1, true)`, [auth.companyId]);
        const result = await client.query<{ n: number }>(
          'SELECT count(*)::int AS n FROM memberships WHERE company_id = $1',
          [auth.companyId],
        );
        await client.query('ROLLBACK');
        return result.rows[0]?.n ?? 0;
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
      }
    });
    check(
      'kaleo_runtime opera con contexto de tenant',
      scoped > 0,
      `${scoped} membership(s) de la empresa de prueba`,
    );
  } else {
    console.log('· No hay memberships para probar el contexto de tenant');
  }

  if (failures.length > 0) {
    throw new Error(`Fallaron ${failures.length} verificación(es): ${failures.join(', ')}`);
  }

  console.log('\nRESULTADO: roles de aplicación OK');
}

main().catch((error) => {
  console.error('ERROR:', (error as Error).message);
  process.exit(1);
});
