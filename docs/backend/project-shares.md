# Enlaces compartidos de proyecto

> **Estado:** enlaces públicos de solo lectura para clientes, interventoría o
> socios, con token opaco, alcance y expiración.

## Modelo

| Tabla | Uso |
|---|---|
| `project_share_links` | Token hasheado, etiqueta, alcance, expiración y contador de visitas |

Reglas:

- El token se genera en el backend y solo se devuelve al crear el enlace.
- Se almacena únicamente su hash SHA-256 (`token_hash`), nunca el token plano.
- Alcances disponibles: `summary` (datos del proyecto) y `budget`
  (resumen + detalle del presupuesto aprobado más reciente).
- La expiración es opcional y debe estar entre 1 y 365 días.
- Un enlace revocado o expirado deja de resolver de inmediato.
- El portal público no requiere autenticación; usa la conexión privilegiada
  (patrón invitaciones) y filtra `company_id` explícitamente en cada consulta.
- El endpoint público está limitado a 30 peticiones por minuto por IP.

## Endpoints

```http
GET    /api/projects/:projectId/shares
POST   /api/projects/:projectId/shares
DELETE /api/projects/:projectId/shares/:id
GET    /api/public/shares/:token
```

Body para crear:

```json
{
  "label": "Cliente",
  "scope": "budget",
  "expiresInDays": 30
}
```

La respuesta de creación incluye `token`; la URL pública es
`/share/<token>` en el frontend.

## Permisos

- `construction.projects.share`

Owner/Admin pueden crear y revocar; Viewer no.

## Frontend

- Botón **Compartir** en el workspace del proyecto.
- Modal para crear enlaces (etiqueta, alcance y días de expiración), copiar la
  URL recién creada, listar visitas y revocar.
- Vista pública `/share/:token` sin layout autenticado, con resumen del
  proyecto, métricas del presupuesto, detalle de actividades y botón de
  impresión/PDF.
