/**
 * Verifica que los permisos de backend y packages/shared estén sincronizados,
 * y que frontend/src/constants/permissions.ts re-exporte de @saas/shared.
 *
 * Se ejecuta en CI para prevenir drift.
 *
 * Uso: npx tsx scripts/check-permissions-sync.ts (desde la carpeta backend/)
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// __dirname apunta a scripts/; subimos un nivel para llegar a la raíz del repo.
const root = resolve(__dirname, '..');

function extractPermissionCodes(filePath: string): Set<string> {
  const content = readFileSync(filePath, 'utf-8');
  const matches = content.matchAll(/'([a-z]+:[a-z]+)'/g);
  return new Set([...matches].map((m) => m[1]));
}

function fileContainsReexport(filePath: string, from: string): boolean {
  const content = readFileSync(filePath, 'utf-8');
  return content.includes(from);
}

const backendFile = resolve(root, 'backend/src/common/constants/permissions.ts');
const sharedFile  = resolve(root, 'packages/shared/src/permissions.ts');
// El frontend ahora re-exporta de @saas/shared, ya no tiene los códigos inline.
// Verificamos que el re-export exista, no los códigos directamente.
const frontendFile = resolve(root, 'frontend/src/constants/permissions.ts');

const backend = extractPermissionCodes(backendFile);
const shared  = extractPermissionCodes(sharedFile);

let hasError = false;

// 1. Backend y shared deben estar sincronizados (fuentes de verdad con códigos)
const onlyInBackend = [...backend].filter((p) => !shared.has(p));
const onlyInShared  = [...shared].filter((p) => !backend.has(p));

if (onlyInBackend.length > 0) {
  console.error('❌ Permisos en backend pero NO en packages/shared:', onlyInBackend);
  hasError = true;
}
if (onlyInShared.length > 0) {
  console.error('❌ Permisos en packages/shared pero NO en backend:', onlyInShared);
  hasError = true;
}

// 2. El frontend debe re-exportar de @saas/shared (ya no tiene códigos inline)
const frontendReexports = fileContainsReexport(frontendFile, '@saas/shared');
if (!frontendReexports) {
  console.error(
    '❌ frontend/src/constants/permissions.ts no re-exporta de @saas/shared.',
    'Asegúrate de que contenga: export { Permissions } from "@saas/shared"',
  );
  hasError = true;
}

if (hasError) {
  console.error('\nSolución: sincronizar backend/src/common/constants/permissions.ts y packages/shared/src/permissions.ts.');
  process.exit(1);
}

console.log(`✅ ${backend.size} permisos sincronizados entre backend y shared. Frontend re-exporta de @saas/shared.`);
