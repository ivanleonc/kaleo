import { nextTick, ref } from 'vue';
import { STORAGE_KEYS } from '@/utils/storage-keys';

const SIDEBAR_PIN_KEY = STORAGE_KEYS.sidebarPinned;

function readSidebarPinned(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_PIN_KEY) === '1';
  } catch {
    return false;
  }
}

// Estado a nivel de módulo: el sidebar "recuerda" su estado entre cambios de
// ruta (el layout puede remontarse) y AppTopbar/AppSidebar comparten los refs.
const isSidebarExpanded = ref(false);
const isSidebarPinned = ref(readSidebarPinned());
const isMobileSidebarOpen = ref(false);

let mobileMenuButton: HTMLButtonElement | null = null;
let sidebarHoverTimeout: ReturnType<typeof setTimeout> | null = null;

export function useSidebar() {
  /** AppTopbar registra el botón hamburguesa para devolverle el foco al cerrar. */
  const registerMobileMenuButton = (el: HTMLButtonElement | null) => {
    mobileMenuButton = el;
  };

  const toggleSidebarPinned = () => {
    isSidebarPinned.value = !isSidebarPinned.value;
    try {
      localStorage.setItem(SIDEBAR_PIN_KEY, isSidebarPinned.value ? '1' : '0');
    } catch {
      // Modo privado o storage bloqueado: el pin solo durará la sesión.
    }
  };

  const toggleMobileSidebar = () => {
    isMobileSidebarOpen.value = !isMobileSidebarOpen.value;
  };

  /** Al cerrar el cajón el foco no debe quedarse en un nodo que desaparece. */
  const closeMobileSidebar = () => {
    isMobileSidebarOpen.value = false;
    nextTick(() => mobileMenuButton?.focus());
  };

  // Controladores súper suaves para el Sidebar
  const handleMouseEnter = () => {
    if (sidebarHoverTimeout) {
      clearTimeout(sidebarHoverTimeout);
      sidebarHoverTimeout = null;
    }
    // Si está fijado, el hover no debe colapsarlo al salir el puntero.
    if (isSidebarPinned.value) return;
    isSidebarExpanded.value = true;
  };

  const handleMouseLeave = () => {
    if (isSidebarPinned.value) return;
    // Solo se cierra si el mouse está fuera más de 150ms reales
    sidebarHoverTimeout = setTimeout(() => {
      isSidebarExpanded.value = false;
    }, 150);
  };

  /**
   * Equivalente por teclado a handleMouseLeave: al salir el foco del sidebar
   * (p. ej. volviendo al contenido) se colapsa, pero no cuando el foco salta
   * entre enlaces internos (relatedTarget sigue dentro).
   */
  const handleSidebarFocusOut = (event: FocusEvent) => {
    if (isSidebarPinned.value) return;
    const next = event.relatedTarget as Node | null;
    if (next && (event.currentTarget as HTMLElement).contains(next)) return;
    isSidebarExpanded.value = false;
  };

  return {
    isSidebarExpanded,
    isSidebarPinned,
    isMobileSidebarOpen,
    registerMobileMenuButton,
    toggleSidebarPinned,
    toggleMobileSidebar,
    closeMobileSidebar,
    handleMouseEnter,
    handleMouseLeave,
    handleSidebarFocusOut,
  };
}
