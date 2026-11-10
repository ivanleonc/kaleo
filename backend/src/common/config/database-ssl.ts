import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface DatabaseSslOptions {
  ca: string;
  rejectUnauthorized: boolean;
}

/**
 * TLS para el pooler de Supabase.
 *
 * - Por defecto usa la CA pública incluida en `backend/certs/prod-ca-2021.crt`
 *   y verifica el certificado y el hostname (`rejectUnauthorized: true`).
 * - `DATABASE_SSL=false` desactiva TLS. Solo para un PostgreSQL local sin TLS.
 * - `DATABASE_SSL_CA` permite indicar otra ruta de CA.
 *
 * Falla cerrado si TLS está activo y la CA no existe.
 */
export function databaseSslOptions(): DatabaseSslOptions | undefined {
  if (process.env.DATABASE_SSL === 'false') return undefined;

  const defaultCaPath = fileURLToPath(
    new URL('../../../certs/prod-ca-2021.crt', import.meta.url),
  );
  const caPath = process.env.DATABASE_SSL_CA || defaultCaPath;

  if (!existsSync(caPath)) {
    throw new Error(
      `No se encontró la CA de Supabase en ${caPath}. ` +
        'Descárgala o define DATABASE_SSL=false solo para un PostgreSQL local sin TLS.',
    );
  }

  return { ca: readFileSync(caPath, 'utf8'), rejectUnauthorized: true };
}
