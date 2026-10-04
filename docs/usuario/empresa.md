# Configuración de Empresa

## Ver la información de empresa

Navega a **Configuración** en el menú lateral. Verás los datos actuales de tu organización:

- Nombre, Tax ID / NIT / RFC
- Teléfono y email de contacto
- Dirección completa
- Zona horaria

## Editar la empresa

Haz clic en **Editar Empresa** (requiere permiso `company:update`):

| Campo | Descripción |
|---|---|
| Nombre | Nombre visible de la organización |
| Tax ID / NIT / RFC | Identificador fiscal |
| Identificador (slug) | Texto corto que aparece en la URL |
| URL del Logo | Imagen que aparece en la interfaz |
| Teléfono y Email | Datos de contacto de la empresa |
| Dirección | Dirección, ciudad, estado, país, código postal |
| Zona Horaria | Afecta las fechas de auditoría |

## El identificador (slug)

El slug es la parte legible de la URL de tu empresa. Por ejemplo, si el slug es `mi-empresa`, tu URL será `/companies/mi-empresa/settings`.

::: warning
Cambiar el slug **actualiza todas las URLs** de tu empresa. Los enlaces guardados como favoritos, integraciones con estas URLs, o bookmarks dejarán de funcionar. El sistema te mostrará una advertencia antes de guardar.
:::

**Reglas del slug:**
- Solo letras minúsculas, números y guiones (`-`)
- Máximo 100 caracteres
- Ejemplo: `mi-empresa-sas`, `acme-corp`, `empresa-colombia-2024`

## Logo de la empresa

Ingresa la URL directa de tu imagen. Debe ser una URL HTTPS que apunte a un archivo de imagen (`.png`, `.jpg`, `.svg`). El logo se muestra en el encabezado de la empresa.

Tras escribir la URL, verás una vista previa. Si la imagen no carga, aparecerá un aviso antes de guardar.
