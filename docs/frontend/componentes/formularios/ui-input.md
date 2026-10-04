# UiInput

Input de texto con label flotante, validación de error y toggle de contraseña.

## Props

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `label` | string | — | Etiqueta visible del campo |
| `type` | `'text' \| 'email' \| 'password' \| 'number' \| 'tel' \| 'url' \| 'search'` | `'text'` | Tipo HTML del input |
| `placeholder` | string | `''` | Placeholder del input |
| `required` | boolean | `false` | Marca el campo como obligatorio |
| `disabled` | boolean | `false` | Deshabilita el input |
| `autocomplete` | string | — | Atributo HTML autocomplete |
| `name` | string | — | Atributo HTML name |
| `error` | `string \| null` | `null` | Mensaje de error (se muestra debajo del input) |

## Model

`v-model: string`

## Emits

| Evento | Descripción |
|---|---|
| `blur` | Cuando el input pierde el foco |
| `focus` | Cuando el input obtiene el foco |

## Ejemplos

```vue
<!-- Input básico -->
<UiInput v-model="form.name" label="Nombre Completo" required />

<!-- Email con autocompletado -->
<UiInput
  v-model="form.email"
  label="Correo Electrónico"
  type="email"
  autocomplete="email"
  :error="emailError"
/>

<!-- Contraseña (incluye toggle show/hide automáticamente) -->
<UiInput
  v-model="form.password"
  label="Contraseña"
  type="password"
  autocomplete="new-password"
/>

<!-- Input deshabilitado (solo lectura visual) -->
<UiInput :model-value="member.name" label="Nombre" disabled />

<!-- Con validación touch-aware -->
<UiInput
  v-model="form.email"
  label="Email"
  type="email"
  :error="emailTouched && !isValidEmail ? 'Email inválido' : null"
  @blur="emailTouched = true"
/>
```

## Notas

- El tipo `password` agrega automáticamente un botón de toggle (ojo) sin configuración adicional
- El error se muestra via `UiFieldError` con `aria-describedby` correctamente enlazado
- `disabled` aplica opacity y `cursor: not-allowed` — no usar para campos de solo lectura visuales, usar directamente `:model-value`
