# Backups y restore

> **Estado:** procedimiento probado el 10 de noviembre de 2026 contra staging.
> **Regla:** producción nunca es el destino de una prueba de restore.

## Estrategia

| Mecanismo | Frecuencia | Uso |
|---|---|---|
| Backup automático de Supabase | Diario (según plan) | Recuperación principal |
| PITR de Supabase | Si el plan lo incluye | Recuperación a un punto en el tiempo |
| `pg_dump` lógico | Semanal o antes de migraciones riesgosas | Verificación y restore controlado |

Los backups contienen datos personales. Se almacenan cifrados, con acceso restringido y se eliminan cuando ya no son necesarios.

## Requisitos

- Cliente PostgreSQL 18 (`pg_dump`, `pg_restore`, `psql`).
- CA pública de Supabase en `backend/certs/prod-ca-2021.crt`.
- Variables de conexión del entorno. No pegar contraseñas en el historial de shell.

## Crear un backup lógico

```bash
export PGSSLMODE=verify-full
export PGSSLROOTCERT=backend/certs/prod-ca-2021.crt

pg_dump "$DATABASE_URL" \
  --schema=public \
  --no-owner \
  --no-privileges \
  --format=custom \
  --file="kaleo_$(date +%F).dump"
```

- `--schema=public` evita objetos internos de Supabase.
- `--no-owner --no-privileges` permite restaurar en un PostgreSQL sin los roles `anon`, `authenticated` o `service_role`.
- Verificar el archivo:

```bash
pg_restore --list kaleo_2026-11-10.dump | wc -l
```

## Restore de prueba

1. Crear una base temporal (contenedor PostgreSQL o proyecto Supabase temporal).

```bash
docker run --rm -d --name kaleo-restore-test \
  -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=kaleo_restore \
  -p 55432:5432 postgres:17
```

2. Restaurar sin dueños ni privilegios:

```bash
PGPASSWORD=test pg_restore \
  --no-owner --no-privileges --exit-on-error \
  -h localhost -p 55432 -U postgres -d kaleo_restore \
  kaleo_2026-11-10.dump
```

Si el dump incluye la entrada `SCHEMA public`, se puede filtrar del TOC con `pg_restore --list` y `pg_restore -L` para evitar el error de esquema existente.

3. Comparar esquema, constraints, triggers, RLS y seeds contra el origen.

4. Destruir el destino y borrar el dump:

```bash
docker rm -f kaleo-restore-test
rm kaleo_2026-11-10.dump
```

## Prueba ejecutada

| Dato | Resultado |
|---|---|
| Origen | `kaleo-staging` (PostgreSQL 17.11) |
| Destino | Contenedor PostgreSQL 17 local |
| Entradas restaurables | 177 |
| Tablas / columnas / índices / constraints | Coinciden |
| Triggers / funciones / RLS | Coinciden |
| Seeds | 32 permisos, 3 roles globales, 73 asignaciones |
| Migraciones | 20/20 |
| Feature flags | 0 (staging sin datos) |
| Resultado | **Restore fiel** |

## Restore de producción

1. Preferir el restore gestionado de Supabase.
2. Si se hace manual, abrir una ventana de mantenimiento.
3. Tomar un backup verificado antes de tocar producción.
4. Restaurar en un proyecto temporal y validar antes de apuntar la aplicación.
5. Verificar `schema_migrations` y los checksums al terminar.
6. No ejecutar `pg_restore --clean` sobre producción sin un backup verificado.

## Frecuencia recomendada

- Backup automático diario.
- Backup lógico semanal y antes de cada migración riesgosa.
- Prueba de restore trimestral o antes de un cambio mayor.
