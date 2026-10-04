# UiExportButton

Botón de descarga de archivos que gestiona todo el proceso de Blob → archivo.

## Props

| Prop | Tipo | Requerido | Descripción |
|---|---|---|---|
| `label` | string | ✅ | Texto del botón |
| `fetcher` | `() => Promise<Blob>` | ✅ | Función que retorna el Blob a descargar |

## Comportamiento

1. El usuario hace clic
2. Se muestra estado de loading
3. Se llama a `fetcher()`
4. Con el Blob resultante: crea URL temporal → `<a>.click()` → revoca la URL
5. El loading desaparece

```vue
<!-- En AuditView -->
<UiExportButton
  label="Exportar CSV"
  :fetcher="fetchExportBlob"
/>

<script setup>
function fetchExportBlob() {
  return auditService.fetchCsvBlob({
    entityType: filterValues.value.entityType || undefined,
    action: filterValues.value.action || undefined,
    from: filterValues.value.from || undefined,
    to: filterValues.value.to || undefined,
  })
}
</script>
```

## Notas

- El `fetcher` recibe los filtros actuales en el momento del clic — siempre exporta lo que se está viendo
- El nombre del archivo lo controla el backend vía `Content-Disposition: attachment; filename="..."`
- Si `fetcher()` lanza un error, se muestra un toast de error automáticamente
