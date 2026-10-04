# UiAvatar

Avatar de usuario con imagen, iniciales o icono fallback.

## Props

| Prop | Tipo | Default | Descripcion |
|---|---|---|---|
| `src` | string | — | URL de la imagen |
| `name` | string | — | Nombre del usuario (para iniciales) |
| `size` | `'sm'\|'md'\|'lg'\|'xl'` | `'md'` | Tamano |
| `loading` | `'eager'\|'lazy'` | `'lazy'` | Estrategia de carga |

## Comportamiento

Prioridad: imagen src → iniciales del name → icono generico.

```vue
<UiAvatar :src="user.avatar_url" :name="user.name" size="sm" />
```
