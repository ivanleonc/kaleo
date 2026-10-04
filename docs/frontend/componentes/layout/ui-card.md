# UiCard

Contenedor de tarjeta con fondo, borde y sombra del design system.

## Props

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `hoverable` | boolean | `false` | Añade efecto hover (borde oscuro + sombra) |

## Slots

| Slot | Descripción |
|---|---|
| `#header` | Cabecera de la tarjeta (fondo diferenciado, padding propio) |
| `default` | Cuerpo principal de la tarjeta |
| `#footer` | Pie de la tarjeta |

## Ejemplos

```vue
<!-- Tarjeta básica -->
<UiCard>
  <p>Contenido de la tarjeta</p>
</UiCard>

<!-- Con header y footer -->
<UiCard>
  <template #header>
    <h3 class="card-title">Datos del Perfil</h3>
  </template>

  <UiDetailGrid>
    <UiInfoRow label="Nombre">{{ user.name }}</UiInfoRow>
  </UiDetailGrid>

  <template #footer>
    <UiButton variant="outline" size="sm" width="auto">Editar</UiButton>
  </template>
</UiCard>

<!-- Hoverable (enlace o item clickeable) -->
<UiCard hoverable @click="openDetail">
  <p>Click para ver detalle</p>
</UiCard>
```

## Notas

- El padding del `#header` y `#footer` es `var(--space-5) var(--space-6)`
- El `#header` y el contenido comparten el padding lateral
- Usa `hoverable` cuando la card actúa como elemento interactivo
