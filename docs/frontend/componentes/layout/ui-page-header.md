# UiPageHeader

Cabecera estándar de cada sección de la aplicación.

## Props

| Prop | Tipo | Requerido | Descripción |
|---|---|---|---|
| `title` | string | ✅ | Título principal de la sección |
| `subtitle` | string | — | Descripción o subtítulo |

## Slots

| Slot | Descripción |
|---|---|
| `#actions` | Botones de acción (lado derecho). Se oculta si está vacío. |

## Ejemplos

```vue
<!-- Con acciones -->
<UiPageHeader
  title="Miembros del Equipo"
  subtitle="Gestiona los accesos y roles de los usuarios."
>
  <template #actions>
    <UiButton v-permission="Permissions.USERS.CREATE" @click="openAddModal" width="auto">
      <IconPlus :size="16" /> Nuevo Miembro
    </UiButton>
  </template>
</UiPageHeader>

<!-- Sin acciones -->
<UiPageHeader
  title="Mi Cuenta"
  subtitle="Gestiona tu información personal."
/>
```

## Notas

- El subtítulo es opcional y puede omitirse para páginas simples
- El slot `#actions` acepta múltiples botones separados (`gap: var(--space-2)`)
- Usa siempre `v-permission` en los botones de acción para ocultar los que el usuario no puede usar
