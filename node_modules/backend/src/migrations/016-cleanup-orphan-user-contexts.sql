-- 016: Limpieza de user_contexts huérfanos con roles borrados lógicamente.
-- Antes del Lote C, borrar un rol dejaba los user_contexts apuntando a un
-- rol con deleted_at != NULL, haciendo que getUserAccess devolviera el
-- acceso como vacío pero sin error visible. Ahora el app-layer ya limpia
-- al borrar (rbac/repositories/role.repository.ts), pero si hay datos
-- históricos sucios esta migración los resuelve.
-- Re-ejecutable sin error.

DELETE FROM user_contexts
WHERE role_id IN (
  SELECT id FROM roles WHERE deleted_at IS NOT NULL
);
