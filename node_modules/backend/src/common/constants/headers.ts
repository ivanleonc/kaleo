/**
 * Nombres de headers propios de la API — single source of truth.
 *
 * `x-company-id` identifica la empresa activa. Viene en la URL del frontend
 * solo como slug legible; el header siempre lleva el UUID porque es lo que
 * usan los repositorios para filtrar y lo que valida CompanyAccessGuard.
 */
export const COMPANY_ID_HEADER = 'x-company-id';
