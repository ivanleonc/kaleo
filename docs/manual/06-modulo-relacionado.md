# 06 — Módulo relacionado (dependencias entre módulos)

> **Cuándo usar este patrón:** Un módulo nuevo necesita datos de otro módulo existente.
> **Ejemplo:** `Invoices` depende de `Members` (para el responsable) y de `Branches` (para la sede de entrega).

---

## Problema que este patrón resuelve

Cuando el módulo B necesita datos del módulo A, hay dos antipatrones comunes:

1. **Importar el store de A directamente en la view de B** — crea acoplamiento fuerte y puede pisar el estado de paginación del módulo A
2. **Duplicar el fetch en el store de B** — duplica lógica y genera inconsistencias

La solución correcta depende del caso:

---

## Caso 1: Datos de referencia para un select/dropdown

**Ejemplo:** Un formulario de Factura necesita un select de "Cliente" (Members).

**Solución:** Cargar los datos de referencia directamente desde el servicio, sin pasar por el store:

```ts
// En InvoicesView.vue — no usa memberStore para no pisar su paginación
const { data: membersForSelect, isLoading: membersLoading } = useAsyncData(
  () => memberService.getMembers({ limit: 200, status: 'active' }),
  { watch: companyId }
);

const memberOptions = computed(() =>
  membersForSelect.value?.data.map((m) => ({ label: m.name, value: m.id })) ?? []
);
```

```html
<UiSelect v-model="form.member_id" label="Responsable" :options="memberOptions" />
```

**Por qué no usar `memberStore`:** El store tiene su propia paginación, filtros y página actual. Si la view de Facturas llama a `memberStore.fetchMembers()`, pisaría el estado que el usuario dejó en `MembersView`.

---

## Caso 2: Datos de otra entidad en una celda de tabla

**Ejemplo:** La tabla de Facturas muestra el nombre de la sede (`branch.name`) junto al número.

**Opción A — Join en el backend (recomendado):** El endpoint `/companies/invoices` ya devuelve `branch_name` en cada fila. No se necesita ningún fetch adicional en el frontend.

**Opción B — Lookup en el frontend:** Si el join en el backend no es viable, usar `useAsyncData` para cargar un mapa de branches al montar la view:

```ts
const { data: branchesMap } = useAsyncData(async () => {
  const res = await branchService.getBranches({ limit: 200 });
  return Object.fromEntries(res.data.map((b) => [b.id, b.name]));
}, { watch: companyId });

// En la celda:
const branchName = (branchId: string) => branchesMap.value?.[branchId] ?? '—';
```

---

## Caso 3: Módulo B necesita crear entidades del módulo A

**Ejemplo:** Desde Facturas se puede crear un nuevo Cliente rápidamente.

**Solución:** Emitir un evento desde el formulario de Facturas y manejar la creación en la view con el service directamente (sin usar el store de Members):

```ts
// En InvoicesView.vue:
const handleQuickCreateMember = async (name: string, email: string) => {
  const result = await memberService.addMember({ name, email });
  // Refrescar el select de clientes sin tocar memberStore
  await membersForSelect.value; // useAsyncData lo tiene como reload()
  reloadMembers(); // reload() del useAsyncData de membersForSelect
  form.member_id = result.data.id;
};
```

---

## Caso 4: Dashboard de módulo B muestra métricas de A y B

**Ejemplo:** El dashboard de Facturación muestra miembros activos + facturas pendientes.

**Solución:** `useDashboardData` con fetchers de ambos servicios:

```ts
const { results, isLoading } = useDashboardData({
  invoices: () => invoiceService.getInvoices({ limit: 1, status: 'pending' }),
  members:  () => memberService.getMembers({ limit: 1, status: 'active' }),
}, { watch: companyId });
```

---

## Reglas para módulos relacionados

| Regla | Razón |
|---|---|
| No usar el store de otro módulo para selects | Evita pisar paginación y filtros del otro módulo |
| Preferir join en el backend sobre lookup en el frontend | Reduce requests y simplifica el frontend |
| Un módulo no debe modificar el store de otro módulo | Cada store es dueño de su estado |
| Para búsqueda de usuarios existentes: `memberService.searchUsers(q)` | Endpoint dedicado para autocompletar (ya existe) |
| Cargar datos de referencia con `useAsyncData` | Loading/error automático, recarga con empresa |

---

## Patrón de autocompletado entre módulos

El endpoint `GET /companies/users/search?q=...` ya existe y devuelve `{ id, name, email }` sin datos sensibles:

```ts
// En cualquier formulario que necesite buscar usuarios:
const searchQuery = ref('');
const { data: searchResults } = useAsyncData(
  () => memberService.searchUsers(searchQuery.value),
  { immediate: false } // no cargar al mount, solo cuando se busca
);

const debouncedSearch = useDebounceFn(async () => {
  if (searchQuery.value.length >= 2) await reloadSearch();
}, 350);
```

---

## Checklist pre-PR

- [ ] El módulo B no importa el store de A para obtener datos de referencia
- [ ] Los datos de referencia se cargan con `useAsyncData` (no `onMounted` manual)
- [ ] Los joins están en el backend cuando el dato relacionado es parte del listado principal
- [ ] El autocompletado usa `memberService.searchUsers` (endpoint existente)
- [ ] Los módulos no se modifican entre sí a través de sus stores
