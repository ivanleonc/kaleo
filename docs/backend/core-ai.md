# core.ai

> **Estado:** esqueleto funcional. No hay integración con un LLM todavía.
> Incluye catálogo de tools, runs, clasificación de riesgo y HITL mínimo.

## Modelo

| Tabla | Uso |
|---|---|
| `ai_tools` | Catálogo de tools sincronizado desde manifests |
| `ai_runs` | Ejecución de una tool por usuario/empresa |
| `ai_action_requests` | Acciones HITL pendientes de aprobación |

- `ai_tools` es catálogo global de solo lectura para `kaleo_app`.
- `ai_runs` y `ai_action_requests` tienen RLS por empresa.
- `risk`: `read`, `conversational`, `business_write`, `external`.
- Una tool con `requires_confirmation`, `business_write` o `external` no se ejecuta directo: crea una acción pendiente.

## Tools de ejemplo

| Tool | Riesgo | HITL | Qué hace |
|---|---|---|---|
| `core.ai.echo` | read | No | Devuelve tenant, usuario e input |
| `core.ai.demo_write` | business_write | Sí | Escribe auditoría `AI_DEMO_WRITE` |

## Endpoints

```http
GET  /api/v1/ai/tools
POST /api/v1/ai/runs
GET  /api/v1/ai/runs/:id
GET  /api/v1/ai/actions?status=pending
POST /api/v1/ai/actions/:id/approve
POST /api/v1/ai/actions/:id/reject
x-company-id: <uuid>
```

Crear run:

```json
{
  "toolCode": "core.ai.echo",
  "input": { "message": "hola" }
}
```

- Tool read: se ejecuta y queda `completed`.
- Tool write: queda `awaiting_confirmation` y crea una acción `pending`.
- Aprobar: reclama la acción de forma atómica, ejecuta y marca `executed`.
- Rechazar: marca `rejected`.

## Permisos

| Permiso | Uso |
|---|---|
| `core.ai.read` | Listar tools, runs y acciones |
| `core.ai.run` | Crear runs |
| `core.ai.approve` | Aprobar/rechazar HITL |

Owner y Admin reciben los tres; Viewer solo lectura.

## Pendiente

- Integración con un proveedor LLM.
- Tool contracts con schema de entrada/salida validado.
- `ai_tools` específicas de packs.
- UI de asistente y bandeja HITL.
- Uso de `ai_runs` para auditoría/costos.
- Tools de negocio reales.

## Migración

`049-core-ai.sql` crea las tablas, RLS y permisos.
Aplicar antes del deploy: el module registry sincroniza `ai_tools` al arrancar.
