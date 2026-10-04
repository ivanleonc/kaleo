# UiPasswordStrength

Indicador visual de fortaleza de contrasena. Muestra las reglas de la politica.

## Props / Model

`v-model: string` — La contrasena a evaluar

## Reglas evaluadas

- Minimo 8 caracteres
- Al menos 1 letra mayuscula
- Al menos 1 letra minuscula
- Al menos 1 numero

## Ejemplo

```vue
<UiInput v-model="form.newPassword" label="Nueva Contrasena" type="password" />
<UiPasswordStrength v-model="form.newPassword" />
```
