# UiBadge

Etiqueta de estado compacta con variantes de color semántico.

## Props

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `label` | string | `''` | Texto de la etiqueta (override por slot default) |
| `variant` | `'success' \| 'warning' \| 'danger' \| 'info' \| 'neutral'` | `'neutral'` | Variante de color |
| `size` | `'sm' \| 'md'` | `'md'` | Tamaño |

## Slot

| Slot | Descripción |
|---|---|
| default | Contenido (reemplaza `label`). Puede incluir iconos. |

## Variantes

| Variante | Color | Uso típico |
|---|---|---|
| `success` | Verde | Activo, completado, aprobado |
| `warning` | Amarillo | Pendiente, temporal, Owner role |
| `danger` | Rojo | Inactivo, error, bloqueado |
| `info` | Azul | Información, roles del sistema |
| `neutral` | Gris | Estado general, roles personalizados |

## Ejemplos

```vue
<!-- Estado de miembro -->
<UiBadge :variant="member.status === 'active' ? 'success' : 'danger'" size="sm">
  {{ member.status === 'active' ? 'Activo' : 'Inactivo' }}
</UiBadge>

<!-- Rol con ícono de corona para Owner -->
<UiBadge
  v-for="role in member.roles"
  :key="role"
  :variant="role === 'Owner' ? 'warning' : 'neutral'"
  size="sm"
>
  <IconCrown v-if="role === 'Owner'" :size="12" stroke-width="2" />
  {{ role }}
</UiBadge>

<!-- Tipo de rol (sistema vs personalizado) -->
<UiBadge size="sm" :variant="role.is_system ? 'info' : 'neutral'">
  {{ role.is_system ? 'Sistema' : 'Personalizado' }}
</UiBadge>

<!-- Badge temporal -->
<UiBadge
  v-if="member.must_change_password"
  variant="warning"
  size="sm"
  title="Contraseña temporal sin cambiar"
>
  Temporal
</UiBadge>
```
