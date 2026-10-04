# UiOfflineBanner

Banner automatico que aparece cuando el navegador pierde conexion a internet.

## Uso

No se necesita ninguna configuracion. El componente esta montado en `App.vue`:

```vue
<!-- App.vue -->
<UiOfflineBanner />
<RouterView />
<UiToast />
```n
Usa `useOnlineStatus()` internamente para detectar los eventos `online`/`offline` del navegador.

## Comportamiento

Cuando `navigator.onLine = false`, muestra un banner fijo en la parte inferior con el mensaje:
**`Sin conexion. Revisa tu internet e intenta de nuevo.`**

Desaparece automaticamente cuando la conexion se restaura.
