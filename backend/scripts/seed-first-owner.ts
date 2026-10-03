/**
 * scripts/seed-first-owner.ts
 *
 * Crea el primer usuario administrador (Owner) y su empresa en un ambiente
 * limpio. Idempotente: si el correo ya existe no hace nada.
 *
 * Uso:
 *   npm run seed:owner -- <entorno> <email> <nombre> <empresa>
 *   Ejemplo (production):
 *     npm run seed:owner -- production admin@miempresa.com "Ana López" "Mi Empresa SAS"
 *
 * El script imprime la contraseña temporal generada. El usuario deberá
 * cambiarla en el primer inicio de sesión.
 */

import 'dotenv/config';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config as dotenvConfig } from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const [, , environment = 'development', email, name = 'Admin', companyName = 'Mi Empresa'] = process.argv;

// Carga el .env del entorno indicado
dotenvConfig({ path: resolve(__dirname, `../.env.${environment}`) });
dotenvConfig({ path: resolve(__dirname, '../.env'), override: false });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error(`ERROR: DATABASE_URL no definida para el entorno "${environment}".`);
  process.exit(1);
}
if (!email || !email.includes('@')) {
  console.error('ERROR: Debes pasar un correo válido. Ej: npm run seed:owner -- production admin@acme.co "Admin" "Acme Corp"');
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

async function main() {
  await client.connect();

  // Verificar si el usuario ya existe
  const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    console.log(`✓ El usuario ${email} ya existe (id=${existing.rows[0].id}). No se hizo nada.`);
    return;
  }

  // Generar contraseña temporal segura
  const tempPassword = randomBytes(8).toString('hex') + 'Ax';
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await client.query('BEGIN');
  try {
    // Crear usuario
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, name, must_change_password)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id`,
      [email, passwordHash, name],
    );
    const userId = userResult.rows[0].id;

    // Crear empresa
    const companyResult = await client.query(
      `INSERT INTO companies (name) VALUES ($1) RETURNING id`,
      [companyName],
    );
    const companyId = companyResult.rows[0].id;

    // Buscar rol Owner global
    const roleResult = await client.query(
      `SELECT id FROM roles WHERE name = 'Owner' AND company_id IS NULL LIMIT 1`,
    );
    if (roleResult.rows.length === 0) {
      throw new Error('Rol Owner no encontrado. ¿Aplicaste las migraciones 003/004?');
    }
    const ownerRoleId = roleResult.rows[0].id;

    // Asignar usuario como Owner
    await client.query(
      `INSERT INTO user_contexts (user_id, company_id, branch_id, role_id)
       VALUES ($1, $2, NULL, $3)`,
      [userId, companyId, ownerRoleId],
    );

    await client.query('COMMIT');

    console.log('');
    console.log('✅ Primer Owner creado exitosamente');
    console.log('─────────────────────────────────────');
    console.log(`  Entorno  : ${environment}`);
    console.log(`  Email    : ${email}`);
    console.log(`  Nombre   : ${name}`);
    console.log(`  Empresa  : ${companyName} (id: ${companyId})`);
    console.log(`  Clave    : ${tempPassword}  ← cambiar en primer login`);
    console.log('─────────────────────────────────────');
    console.log('');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

main()
  .catch((err) => {
    console.error('ERROR:', err.message);
    process.exit(1);
  })
  .finally(() => client.end());
