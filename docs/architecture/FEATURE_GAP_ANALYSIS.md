# Matriz de brechas funcionales

> **Tipo:** comparación entre el estado actual de Kaleo y el objetivo de plataforma con verticales.
> **Base:** auditoría de código y backup (`CURRENT_STATE.md`) + referente funcional (`METROKUBIKO_ANALYSIS.md`).
> **Regla:** no se proponen módulos sin una necesidad de negocio identificable.

---

## 1. Cómo leer esta matriz

### Estados

| Estado | Significado |
|---|---|
| **Implementado** | Existe y cubre el caso base. |
| **Parcial** | Existe una parte, pero falta modelo, reglas o UI. |
| **Ausente** | No existe. |
| **No ahora** | Se decidió explícitamente no construirlo en esta etapa. |

### Prioridades

| Prioridad | Significado |
|---|---|
| **P0** | Bloquea la evolución o la seguridad. |
| **P1** | Necesario para el primer vertical o para operar comercialmente. |
| **P2** | Necesario para el segundo vertical o para escalar. |
| **P3** | Diferencial futuro. |

---

## 2. Platform Kernel

| Capacidad | Estado | Objetivo | Prioridad | Notas |
|---|---|---|---|---|
| Registro, login, refresh, logout | Implementado | Mantener y endurecer | P0 | Base sólida |
| Access/refresh JWT | Implementado | Claims mínimos, rotación con detección de reuso | P0 | Hoy 15 min / 7 días |
| 2FA TOTP | Implementado | Mantener | P1 | Ya existe |
| Recuperación y cambio de contraseña | Implementado | Mantener | P1 | Historial y expiración |
| Verificación de email | Implementado | Mantener | P1 | Ya existe |
| Usuarios globales | Implementado | Mantener | P0 | Identidad única |
| Múltiples empresas por usuario | Parcial | Membership con estado por empresa | P0 | Hoy lock global |
| Invitaciones | Ausente | Email + token + expiración + aceptación | P0 | Elimina búsqueda global |
| Roles y permisos | Parcial | Namespace, scope, roles template | P0 | Hoy `module:action` |
| Sedes | Parcial | Aplicar como frontera o quitar semántica | P0 | Hoy no se aplica |
| Auditoría | Parcial | Transaccional/outbox, request-id, retención | P0 | Hoy fire-and-forget |
| Sesiones y dispositivos | Parcial | `sessions`, familia de refresh, revocación | P1 | Hoy tokens sueltos |
| Planes y suscripciones | Ausente | `plans`, `subscriptions`, entitlements | P1 | No existe |
| Límites por plan | Ausente | Usage counters y enforcement server-side | P1 | No existe |
| Módulos y company_modules | Ausente | Registry + dependencias + enable/disable | P0 | Base del platform-first |
| Configuración por empresa | Parcial | `company_settings` tipado + config por módulo | P1 | Hoy columnas sueltas |
| Archivos/documentos | Parcial | Metadata, versiones, storage, links | P1 | Solo análisis |
| Notificaciones | Ausente | In-app + preferencias + email | P2 | Solo permiso |
| Jobs/outbox | Ausente | Cola transaccional, reintentos, dead-letter | P1 | Necesario para imports/reportes |
| Orquestador de IA | Ausente | `core.ai`: tools, `ai_runs`, HITL, auditoría | P2 | Base del pack de bots |
| Búsqueda global | Ausente | Postgres full-text + filtros por módulo | P2 | No implementar search engine aún |
| API keys/webhooks | Ausente | API pública, scopes, entregas | P2 | Solo permiso |
| Observabilidad | Parcial | Request-id, métricas, dashboards, alertas | P1 | Sentry existe |

---

## 3. Shared Capabilities

| Capacidad | Estado | Objetivo | Prioridad | Reutilización |
|---|---|---|---|---|
| Parties (personas/organizaciones) | Ausente | Base común para clientes, proveedores, contactos y trabajadores | P1 | Evita duplicar CRM y construcción |
| Identidades de canal | Ausente | `party_identities`: email, phone, WhatsApp, Telegram, web | P2 | Misma party entre canales y módulos |
| Roles de party | Ausente | customer, supplier, contractor, employee, contact | P1 | M:N party_roles |
| Catálogo de items | Ausente | Productos/servicios comprables y vendibles | P1 | Construcción, CRM, comercio |
| Unidades de medida | Ausente | Unidades y conversiones | P1 | APU, inventario, ventas |
| Impuestos | Ausente | Tasas por empresa/país | P1 | Presupuestos, compras, ventas |
| Listas de precios | Ausente | Precios por proveedor/cliente/moneda | P2 | Compras y ventas |
| Inventario (ledger) | Ausente | Almacenes, movimientos, saldos, valoración | P1 | Construcción y comercio |
| Compras | Ausente | Órdenes, recepciones, facturas | P1 | Construcción y comercio |
| Documentos | Parcial | Metadata, versiones, links polimórficos | P1 | Todos los verticales |
| Actividades | Ausente | Llamadas, reuniones, tareas, notas | P2 | CRM y proyectos |
| Comentarios/menciones | Ausente | Colaboración por entidad | P2 | Todos |
| Reportes guardados | Ausente | Definición, ejecución, exportación | P2 | Todos |
| Custom fields | Ausente | Definiciones + valores validados | P3 | Solo metadata no crítica |
| Automatizaciones | Ausente | Triggers, condiciones, acciones | P3 | Todos |

---

## 4. Pack Construcción

| Capacidad | Estado | Objetivo | Prioridad | Depende de |
|---|---|---|---|---|
| Proyectos/obras | Ausente | Eje del pack, código, cliente, estado, moneda | P1 | Parties, company |
| Miembros de proyecto | Ausente | Roles por proyecto | P1 | Memberships |
| Recursos de estimación | Ausente | Material, labor, equipo, transporte, subcontrato | P1 | Catálogo, unidades |
| Precios de recursos | Ausente | Historial, proveedor, vigencia | P1 | Suppliers, parties |
| APUs | Ausente | Composición, rendimiento, unidad, versión | P1 | Recursos |
| Versiones de APU | Ausente | Draft/approved/superseded, snapshot | P1 | APUs |
| Líneas de APU | Ausente | Insumo, cantidad, desperdicio, costo snapshot | P1 | APU versions |
| Especificaciones/fotos | Ausente | Documentos técnicos del APU | P2 | Documentos |
| Memoria de cantidades | Ausente | Takeoff sheets y líneas | P1 | Proyectos, APUs |
| Presupuestos | Ausente | Versión, WBS, ítems, totales | P1 | Proyectos, APUs |
| Aprobación de presupuesto | Ausente | Workflow y snapshot | P1 | Presupuestos |
| Cambios de alcance | Ausente | Adendas/change orders | P2 | Presupuestos |
| Órdenes de compra | Ausente | Compra contra proyecto/stock | P1 | Compras compartidas |
| Recepciones | Ausente | Entrada a almacén y costo | P1 | Inventario |
| Contratos de mano de obra | Ausente | Destajo, tarifa, cantidad | P1 | Parties, proyectos |
| Producción | Ausente | Avance por contrato/período | P1 | Contratos |
| Nómina | Ausente | Liquidación y pagos | P3 | Producción, legislación |
| Costos comprometidos/reales | Ausente | Ledger por proyecto/ítem | P1 | Compras, inventario, mano de obra |
| Variaciones | Ausente | Presupuesto vs. real | P1 | Costos |
| Programación | Ausente | Actividades, dependencias, avance | P2 | Proyectos |
| Ruta crítica | Ausente | CPM, línea base | P3 | Programación |
| Reportes de obra | Parcial | PDF/Excel, avance, costos | P2 | Reportes compartidos |

---

## 5. Pack CRM

| Capacidad | Estado | Objetivo | Prioridad | Depende de |
|---|---|---|---|---|
| Parties y contactos | Ausente | Empresas/personas y roles | P1 | Shared |
| Pipelines y etapas | Ausente | Embudo configurable | P2 | Parties |
| Deals/oportunidades | Ausente | Valor, etapa, probabilidad, cierre | P2 | Pipelines |
| Historial de etapas | Ausente | Trazabilidad de cambios | P2 | Deals |
| Actividades | Ausente | Llamadas, reuniones, tareas, notas | P2 | Shared |
| Cotizaciones | Ausente | Quotes con ítems del catálogo | P2 | Catálogo |
| Forecast | Ausente | Pronóstico por etapa/período | P3 | Deals |
| Email/calendar sync | Ausente | Integración | P3 | Integraciones |
| Reportes CRM | Ausente | Conversión, pipeline, actividad | P3 | Reportes |

---

## 6. Pack Inventario/Comercio

| Capacidad | Estado | Objetivo | Prioridad | Depende de |
|---|---|---|---|---|
| Almacenes | Ausente | Por empresa/sede/proyecto | P1 | Shared inventory |
| Movimientos | Ausente | Entrada, salida, transferencia, ajuste | P1 | Catálogo |
| Saldos | Ausente | Stock actual y reservado | P1 | Movimientos |
| Valoración | Ausente | FIFO/promedio configurable | P2 | Movimientos |
| Conteos | Ausente | Inventario físico y ajustes | P2 | Saldos |
| Órdenes de venta | Ausente | Sales orders | P2 | Catálogo, parties |
| Precios | Ausente | Listas y descuentos | P2 | Catálogo |
| Compras | Ausente | Compartidas con construcción | P1 | Shared procurement |
| Reportes de stock | Ausente | Rotación, mínimos, valorización | P2 | Reportes |

---

## 7. Pack Energía

| Capacidad | Estado | Objetivo | Prioridad | Notas |
|---|---|---|---|---|
| Ingesta de archivos | Parcial | Importación validada | P3 | Hoy mock/cliente |
| Análisis persistidos | Implementado | Mantener como vertical separado | P3 | `analyses` JSONB |
| KPIs y dashboard | Implementado | Mantener | P3 | Demo |
| Validación de resultados | Implementado | Mantener | P3 | Solo energía |
| Reportes regulatorios | Ausente | Si el vertical se comercializa | P3 | Fuera de alcance inicial |
| Integración con medidores | Ausente | No ahora | P3 | Requiere hardware/API |

**Decisión:** energía no debe ser el núcleo. Se conserva como pack aislado o se congela hasta que haya demanda comercial.

---

## 8. Pack Bots y Agent Desk (futuro)

> **Estado del pack:** no implementado. Esta matriz define el alcance y las dependencias que deben existir antes de construirlo. Diseño detallado: `BOTS_PACK_DESIGN.md`.

| Capacidad | Estado | Objetivo | Prioridad | Depende de |
|---|---|---|---|---|
| Ingesta de webhooks | Ausente | Firma, inbox idempotente y respuesta `202` | P3 | `core.jobs`, `core.audit` |
| Canales | Ausente | WhatsApp, Telegram, web, email y webhook genérico | P3 | `bot_channels`, secretos |
| Conversaciones | Ausente | Hilo por party, canal y estado | P3 | `shared.parties` |
| Mensajes | Ausente | Historial append-only con adjuntos | P3 | `shared.documents` |
| Bandeja de agentes | Ausente | Asignación, handoff, cierre y contexto de party | P3 | Memberships |
| Bot builder | Ausente | Agentes versionados: prompt, modelo y tools | P3 | `core.ai` |
| Respuestas con IA | Ausente | Modo `suggest`, `auto_reply`, `human_only` | P3 | `ai_runs` |
| Acciones con HITL | Ausente | Propuesta, aprobación, rechazo y ejecución idempotente | P3 | `ai_action_requests` |
| Analytics de atención | Ausente | Volumen, TFR, contención, handoff, CSAT y costo | P3 | Reportes |
| Límites de plan | Ausente | Mensajes, créditos, canales, agentes y almacenamiento | P3 | Entitlements |
| Webhooks salientes | Ausente | Notificar a sistemas del cliente | P3 | `core.api` |

**Reglas específicas:**

- El pack se registra por manifest y nunca forma parte de `core.*`.
- El webhook no procesa el mensaje: persiste inbox + outbox y responde `202`.
- Todo contacto externo se resuelve contra `parties`; no hay tabla de contactos del pack.
- La IA se ejecuta en `core.ai`; las escrituras de negocio requieren aprobación humana y auditoría.
- `crm` y `construction.projects` son dependencias opcionales solo por tools, no por imports.

**No incluye en la primera versión:** constructor visual de flujos, voz, marketplace de bots, entrenamiento propio de modelos, campañas masivas salientes.

---

## 9. Cross-cutting

| Capacidad | Estado | Objetivo | Prioridad |
|---|---|---|---|
| Aislamiento tenant | Parcial | FKs compuestas + RLS + tests | P0 |
| Auditoría transaccional | Parcial | Outbox/auditoría atómica | P0 |
| Idempotencia | Ausente | POST financieros seguros | P1 |
| Concurrencia optimista | Ausente | `version`/ETag | P1 |
| Dinero y moneda | Ausente | `numeric` + currency + tax | P1 |
| Versionado de documentos | Ausente | APUs, presupuestos, contratos | P1 |
| Jobs/colas | Ausente | Imports, reportes, AI | P1 |
| Idempotencia de webhooks | Ausente | Inbox unique + job idempotente | P1 |
| HITL de acciones de IA | Ausente | Propuesta + aprobación + auditoría | P2 |
| Testing de integración | Parcial | PostgreSQL real y tenant isolation | P1 |
| Performance/load testing | Ausente | Antes de escalar | P2 |
| Accesibilidad | Parcial | Auditoría WCAG de componentes nuevos | P2 |
| i18n | Parcial | Extracción de textos | P3 |
| Documentación | Parcial | Actualizar y mantener ADRs | P1 |

---

## 10. Componentes reutilizables

| Componente actual | Reutilización |
|---|---|
| Auth/sesión/2FA | Kernel |
| `CompanyAccessGuard` | Base para `TenantGuard` |
| `PermissionsGuard`/`RolesGuard` | Base para module guards |
| RBAC | Kernel, con namespaces y scope |
| Sedes | Kernel/tenancy, corregidas |
| `AuditLogInterceptor` | Base para auditoría transaccional |
| `UiDataTable`, filtros, paginación | Shared UI |
| `UiFormModal`, `UiFormSection` | Formularios de todos los packs |
| `UiExportMenu` | Reportes/exportación |
| `useCompanyPath`, tenant utils | Shell multiempresa |
| `createPaginatedStore` | Stores de listados |
| CI + permission sync | Kernel quality gate |
| Sentry | Observabilidad transversal |
| `analyses` | Pack energía, no APU |

---

## 11. Riesgos técnicos por módulo

| Módulo | Riesgo principal | Mitigación |
|---|---|---|
| Kernel/tenancy | Fuga cross-tenant | FKs compuestas, RLS, tests |
| Memberships | Lock/revocación global | Estado por empresa y sesiones por empresa |
| RBAC | Explosión de permisos | Namespace, roles template, scope |
| Planes/entitlements | Bypass de límites | Enforcement server-side + usage counters |
| Parties | Duplicación de clientes/proveedores | Party roles + profiles |
| Catálogo | Mezclar productos con recursos de APU | Recursos separados; link opcional a item |
| APUs | Cálculo incorrecto/irreproducible | Versiones, snapshots, tests dorados |
| Presupuestos | Cambios destructivos | Aprobación inmutable + versiones |
| Inventario | Stock negativo/duplicado | Ledger, row locks, idempotencia |
| Compras | Costos duplicados | Unique por origen contable |
| Mano de obra | Producción no aprobada | Workflow de aprobación |
| Costos | Doble posteo | `cost_entries` append-only + reversos |
| Programación | Complejidad CPM prematura | Actividades simples primero |
| CRM | Convertirse en un CRM genérico sin foco | Pipeline mínimo + parties/catálogo |
| IA | Fuga de datos/acciones no auditadas | Tools con permisos, confirmación, auditoría |
| Bots | Saturación por ráfagas de webhooks | Inbox + outbox + pg-boss, backpressure |
| Bots | Contactos duplicados por canal | `party_identities` unique + upsert |
| Bots | Acoplamiento del kernel al pack | Manifest, `core.ai` genérico, test de arquitectura |
| Bots | Acción de IA no autorizada | Principal de mínimo privilegio + HITL + RLS |
| Frontend | Sidebar monolítico | Module registry |

---

## 12. Qué construir y qué no

### Construir ahora (P0/P1)

1. Kernel hardening: memberships, invitaciones, tenant isolation, auditoría.
2. Module registry, planes, entitlements y company_modules.
3. Parties, catálogo, unidades, impuestos.
4. Proyectos, APUs, presupuestos.
5. Inventario/compras compartidos.
6. Costos comprometidos/reales.
7. Reportes básicos y exportación.
8. Tests de aislamiento y cálculos.

### Construir después (P2)

- CRM completo.
- Programación con dependencias y avance.
- Colaboración (comentarios/menciones).
- Notificaciones.
- API keys/webhooks.
- Reportes programados.
- IA asistida con confirmación.
- Fundaciones de bots: `core.ai`, `party_identities`, inbox/outbox y límites.

### No construir todavía (P3)

| Capacidad | Por qué no ahora |
|---|---|
| Nómina completa | Complejidad legal y contable; validar antes destajo |
| Contabilidad general | Fuera del núcleo; integrar con proveedor |
| BIM/IFC | Muy alto costo; no es necesario para APUs |
| Marketplace | Requiere masa crítica y confianza |
| App móvil nativa | La web responsive cubre la primera etapa |
| Edición colaborativa en tiempo real | Complejidad CRDT/OT; no es diferenciador inicial |
| Ruta crítica CPM avanzada | Primero actividades y avance |
| Motor de IA propio | Usar proveedor con herramientas y permisos |
| Microservicios | El monolito modular es suficiente |
| Multi-región/white-label | Hasta validar dos verticales |
| Búsqueda con Elastic/OpenSearch | Postgres full-text primero |
| Pack de bots | Requiere `core.ai`, parties, jobs y entitlements maduros |
| Constructor visual de flujos de bot | La versión inicial usa agentes versionados y tools |
| Voz y campañas masivas | Requiere compliance y volumen validado |

---

## 13. Conclusión

La brecha no es “faltan pantallas”. La brecha es:

1. **Kernel**: tenancy, memberships, auditoría, planes y módulos.
2. **Capacidades compartidas**: parties, catálogo, inventario, compras.
3. **Primer vertical profundo**: construcción (APUs, presupuestos, costos).
4. **Segundo vertical**: CRM, para validar la reutilización.
5. **Operación**: jobs, observabilidad, testing y seguridad.
6. **Futuro**: bots y atención de agentes sobre `core.ai`, `shared.parties` y la misma cola de jobs.

Construir APUs y CRM al mismo tiempo sin kernel ni capacidades compartidas produciría dos productos duplicados dentro de la misma base. El orden correcto es kernel → shared → construcción → inventario → CRM → bots, con las fundaciones de IA y jobs preparadas desde la fase 2.
