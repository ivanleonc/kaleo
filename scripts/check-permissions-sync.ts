/**
 * Verifica que los permisos de backend y frontend estén sincronizados.
 * Se ejecuta en CI para prevenir drift.
 *
 * Uso: npx tsx scripts/check-permissions-sync.ts
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname);

function extractPermissionCodes(filePath: string): Set<string> {
  const content = readFileSync(filePath, 'utf-8');
  const matches = content.matchAll(/'([a-z]+:[a-z]+)'/g);
  return new Set([...matches].map((m) => m[1]));
}

const backendFile = resolve(root, 'backend/src/common/constants/permissions.ts');
const frontendFile = resolve(root, 'frontend/src/constants/permissions.ts');
const sharedFile = resolve(root, 'packages/shared/src/permissions.ts');

const backend = extractPermissionCodes(backendFile);
const frontend = extractPermissionCodes(frontendFile);
const shared = extractPermissionCodes(sharedFile);

let hasError = false;

const onlyInBackend = [...backend].filter((p) => !frontend.has(p));
const onlyInFrontend = [...frontend].filter((p) => !backend.has(p));
const notInShared = [...backend].filter((p) => !shared.has(p));

if (onlyInBackend.length > 0) {
  console.error('❌ Permisos en backend pero NO en frontend:', onlyInBackend);
  hasError = true;
}
if (onlyInFrontend.length > 0) {
  console.error('❌ Permisos en frontend pero NO en backend:', onlyInFrontend);
  hasError = true;
}
if (notInShared.length > 0) {
  console.warn('⚠️  Permisos no en packages/shared (actualiza src/permissions.ts):', notInShared);
}

if (hasError) {
  console.error('\nSolución: sincronizar los tres archivos de permisos.');
  process.exit(1);
}

console.log(`✅ ${backend.size} permisos sincronizados entre backend, frontend y shared.`);
