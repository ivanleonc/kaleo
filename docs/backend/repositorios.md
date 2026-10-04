# Repositorios SQL

Kaleo usa **TypeORM únicamente como gestor de conexiones**, no como ORM completo. Todas las queries son SQL plano ejecutado via `DataSource.query()`.

## ¿Por qué SQL crudo?

| Con ORM (TypeORM entities) | Con SQL crudo |
|---|---|
| Queries generadas automáticamente (más difícil de optimizar) | Control total del SQL |
| Migrations generadas (pueden tener errores) | Migrations manuales, revisadas |
| Acoplamiento a decoradores `@Entity` | Sin entidades, más limpio |
| Difícil migrar a otro motor | Fácil portar a Kysely/Drizzle en el futuro |
| `any[]` de todas formas con raw queries | `any[]` tipado con `rows<T>()` |

## `rows<T>()` y `row<T>()`

Definidos en `backend/src/common/utils/db.ts`:

```ts
/**
 * Castea el resultado de dataSource.query() a un array tipado.
 * Centraliza el cast any[] → T[] en un único lugar documentado.
 */
export function rows<T>(result: unknown[]): T[] {
  return result as T[]
}

/**
 * Devuelve el primer elemento o undefined.
 * Para queries que retornan 0 o 1 filas (WHERE id = $1).
 */
export function row<T>(result: unknown[]): T | undefined {
  return (result as T[])[0]
}

/**
 * Wrapper que aplica rows<T> automáticamente.
 */
export async function typedQuery<T>(
  dataSource: { query(sql: string, params?: unknown[]): Promise<unknown[]> },
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await dataSource.query(sql, params)
  return rows<T>(result)
}
```

### Uso en repositorios

```ts
// Lista tipada
const branches = rows<BranchRow>(
  await this.dataSource.query(
    `SELECT * FROM branches WHERE company_id = $1`,
    [companyId]
  )
)

// Un solo registro
const user = row<UserRow>(
  await this.dataSource.query(
    `SELECT * FROM users WHERE id = $1`,
    [userId]
  )
)

// undefined si no existe — no null
if (!user) throw new NotFoundException('Usuario no encontrado')
```

## `db-rows.ts` — interfaces de filas

Todas las interfaces de filas SQL viven en `backend/src/common/types/db-rows.ts`:

```ts
export interface CompanyRow {
  id: string
  name: string
  tax_id: string | null
  slug: string | null
  is_active: boolean
  logo_url?: string | null
  // ... etc
}

export interface TenantRow {
  id: string
  name: string
  tax_id: string | null
  slug: string | null
  roles: string[]  // array_agg de roles
}

export interface RoleRow {
  id: string
  name: string
  description: string | null
  color: string | null
  company_id: string | null
  is_system?: boolean
}

export interface BranchRow {
  id: string
  company_id: string
  name: string
  // ... todos los campos de la tabla branches
}

// Para agregar una nueva entidad:
export interface InvoiceRow {
  id: string
  company_id: string
  number: string
  status: string
  amount: string  // NUMERIC en Postgres → string en JS
  due_date: string | null
  created_at: string
  updated_at: string
}
```

::: tip
Postgres `NUMERIC` y `BIGINT` se retornan como `string` en el driver `pg`. No como `number`. Conviértelos explícitamente: `parseInt(row.total, 10)`, `parseFloat(row.amount)`.
:::

## `sql.helper.ts`

### `buildWhere()`

Construye cláusulas WHERE con parámetros posicionales `$1, $2, ...`:

```ts
const { where, values, nextIndex } = buildWhere(
  [
    { clause: 'company_id = $?', value: companyId },
    { clause: 'deleted_at IS NULL' },
    filters.search
      ? { clause: '(name ILIKE $? OR email ILIKE $?)', value: `%${filters.search}%`, reuse: true }
      : undefined,
    filters.status === 'active'
      ? { clause: 'is_active = TRUE' }
      : undefined,
  ],
  1,  // startIndex
)

// Resultado:
// where: "company_id = $1 AND deleted_at IS NULL AND (name ILIKE $2 OR email ILIKE $2)"
// values: [companyId, '%search%']
// nextIndex: 3
```

El flag `reuse: true` usa el mismo `$N` para múltiples apariciones del mismo valor.

### `buildDynamicUpdate()`

Construye `SET campo = $N, ...` para UPDATEs parciales:

```ts
const { updates, values, startIndex } = buildDynamicUpdate(
  { name: 'Nueva Empresa', slug: 'nueva-empresa', logo_url: null },
  ['name', 'slug', 'logo_url', 'tax_id'],  // campos permitidos
  { nullEmptyStrings: ['logo_url', 'tax_id'] }  // convierte '' → null
)

// updates: ["name = $1", "slug = $2", "logo_url = $3"]
// values: ['Nueva Empresa', 'nueva-empresa', null]
// startIndex: 4
```

### `buildOrderBy()`

```ts
const SORT_COLUMNS: Record<string, string> = {
  name: 'u.name',
  email: 'u.email',
  created_at: 'u.created_at',
}

const orderBy = buildOrderBy(SORT_COLUMNS, { sortBy: 'name', sortDir: 'asc' }, 'name')
// → "u.name ASC"
```

## `transaction.helper.ts`

```ts
await runInTransaction(this.dataSource, async (queryRunner) => {
  // Todas las queries dentro son atómicas
  const user = await queryRunner.query(`INSERT INTO users ... RETURNING *`, [...])
  await queryRunner.query(`INSERT INTO user_contexts ...`, [user[0].id, ...])
})
// Si cualquiera falla → rollback automático
```

## Patrón de repository class

```ts
// backend/src/invoices/repositories/invoice.repository.ts
import { Injectable, NotFoundException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { rows, row } from '../../common/utils/db.js'
import { buildWhere, buildDynamicUpdate } from '../../common/utils/sql.helper.js'
import { buildOrderBy, type SortSpec } from '../../common/dto/pagination-query.dto.js'
import type { InvoiceRow } from '../../common/types/db-rows.js'

const SORT_COLUMNS: Record<string, string> = {
  number: 'number', amount: 'amount', created_at: 'created_at',
}

@Injectable()
export class InvoiceRepository {
  constructor(private dataSource: DataSource) {}

  async findPaged(companyId: string, page = 1, limit = 20, sort: SortSpec = {}) {
    const safePage = Math.max(1, page)
    const safeLimit = Math.min(100, Math.max(1, limit))
    const offset = (safePage - 1) * safeLimit

    const { where, values, nextIndex } = buildWhere([
      { clause: 'company_id = $?', value: companyId },
      { clause: 'deleted_at IS NULL' },
    ], 1)

    const orderBy = buildOrderBy(SORT_COLUMNS, sort, 'created_at')

    const [countResult, data] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*) as total FROM invoices WHERE ${where}`, values
      ),
      rows<InvoiceRow>(await this.dataSource.query(
        `SELECT * FROM invoices WHERE ${where}
         ORDER BY ${orderBy} LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
        [...values, safeLimit, offset],
      )),
    ])

    return {
      data,
      total: parseInt(countResult[0]?.total ?? '0', 10),
      page: safePage,
      limit: safeLimit,
    }
  }

  async findById(id: string, companyId: string): Promise<InvoiceRow | undefined> {
    return row<InvoiceRow>(await this.dataSource.query(
      `SELECT * FROM invoices WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    ))
  }
}
```

## Patrón de tests de repositorio

```ts
// Stub de DataSource que captura queries sin BD real
function createDataSourceStub(rows: unknown[] = []) {
  const calls: Array<{ sql: string; params: unknown[] }> = []
  return {
    calls,
    dataSource: {
      query: async (sql: string, params: unknown[] = []) => {
        calls.push({ sql, params })
        return rows
      },
    },
  }
}

it('findById retorna undefined si no existe la factura', async () => {
  const { dataSource } = createDataSourceStub([])  // Stub retorna array vacío
  const repo = new InvoiceRepository(dataSource as any)
  const result = await repo.findById('unknown-id', 'company-1')
  expect(result).toBeUndefined()
})
```
