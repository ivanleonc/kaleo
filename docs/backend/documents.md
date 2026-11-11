# Documentos

> **Estado:** metadata, versiones, checksum SHA-256, vínculos polimórficos y
> binarios en object storage.

## Modelo

| Tabla | Uso |
|---|---|
| `documents` | Metadata y puntero a la versión actual |
| `document_versions` | Versiones inmutables con `storage_key`, tamaño, tipo y checksum |
| `document_links` | Vínculos polimórficos (`entity_type`, `entity_id`) |

`documents.current_version` apunta a `document_versions.version`. Subir una
versión crea una fila nueva y actualiza el puntero dentro de la misma
transacción. Las versiones anteriores no se borran.

`document_links.entity_id` no tiene FK porque el destino es polimórfico. El
servicio valida que sea UUID y normaliza `entity_type`; la integridad del
destino la garantiza el módulo que crea el vínculo.

## Storage

El binario nunca vive en PostgreSQL. `DocumentStorageService` soporta dos
drivers:

| Driver | Uso |
|---|---|
| `supabase` | Producción. API REST de Supabase Storage con service role y bucket privado |
| `local` | Desarrollo/tests. `.data/documents` |

Variables:

```env
DOCUMENTS_STORAGE_DRIVER=supabase
SUPABASE_URL=https://<proyecto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=documents
```

El bucket debe existir y ser **privado** (`documents` por defecto). En
producción, si falta la configuración o el bucket, las operaciones de storage
fallan con `503` y un mensaje claro. La descarga siempre la autoriza el backend:
no se exponen URLs públicas ni firmadas al cliente.

## Endpoints

```http
GET    /api/documents?search=&category=&status=&page=&limit=
POST   /api/documents                         # multipart: file + metadata
GET    /api/documents/:id
GET    /api/documents/:id/download?version=N
POST   /api/documents/:id/versions            # multipart: file
PATCH  /api/documents/:id                     # metadata o status
DELETE /api/documents/:id
POST   /api/documents/:id/links
DELETE /api/documents/:id/links/:linkId
x-company-id: <uuid>
Authorization: Bearer <token>
```

Campos aceptados al subir:

- `title` (si falta, se usa el nombre del archivo sin extensión)
- `description`, `category`
- `entityType` + `entityId` (juntos o ninguno)

Límite: **25 MB** por archivo.

## Permisos

| Código | Acción |
|---|---|
| `core.documents.read` | Listar, ver y descargar |
| `core.documents.create` | Subir documentos y versiones |
| `core.documents.update` | Editar metadata, archivar, crear/quitar vínculos |
| `core.documents.delete` | Eliminar documento y versiones |

Owner/Admin tienen los cuatro; Viewer solo lectura.

## Downgrade y solo lectura

`shared.documents` se incluye en el plan core y se escribe con
`assertWritableModule`. Si la suscripción vence, la empresa conserva la lectura
y descarga, pero `POST`, `PATCH` y `DELETE` devuelven `403 SUBSCRIPTION_READ_ONLY`.
Los archivos no se borran.

## Consistencia

1. Se calcula el checksum SHA-256 en memoria.
2. Se sube el binario con una clave `companyId/documentId/uuid`.
3. Se escribe metadata/versión en PostgreSQL.
4. Si la escritura en base falla, se elimina el objeto subido.
5. Al eliminar un documento, se borran las versiones en cascada y luego los
   objetos de storage (los fallos de storage se registran y no revierten la
   transacción).
