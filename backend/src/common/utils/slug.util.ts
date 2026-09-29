/**
 * Normaliza un texto libre a un slug seguro para URL.
 *
 * Reglas (deben coincidir con el `@Matches` de CreateCompanyDto):
 * `^[a-z0-9]+(?:-[a-z0-9]+)*$`, máximo 100 caracteres.
 */
export const SLUG_MAX_LENGTH = 100;

export function slugify(input: string | null | undefined, fallback = 'empresa'): string {
  const base = (input ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos (é -> e)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/^-+|-+$/g, '');

  return base || fallback;
}

/**
 * Agrega un sufijo numérico respetando el largo máximo.
 * `acme`, 2 -> `acme-2`
 */
export function slugWithSuffix(base: string, suffix: number): string {
  const tail = `-${suffix}`;
  const head = base.slice(0, SLUG_MAX_LENGTH - tail.length).replace(/-+$/g, '');
  return `${head}${tail}`;
}
