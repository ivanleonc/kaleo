import { ref, onMounted } from 'vue';

const THEME_COLORS = { dark: '#181818', light: '#ffffff' } as const;

// Estado a nivel de módulo: el tema es global (sidebar y menú de usuario
// comparten el mismo ref; si viviera por instancia, cada consumidor se
// desincronizaría al cambiar desde el otro).
const isDarkMode = ref(
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
);

function syncThemeColor(dark: boolean) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? THEME_COLORS.dark : THEME_COLORS.light);
}

const applyTheme = (dark: boolean) => {
  isDarkMode.value = dark;
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem('theme', dark ? 'dark' : 'light');
  syncThemeColor(dark);
};

const toggleTheme = () => {
  applyTheme(!isDarkMode.value);
};

const initTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    applyTheme(false);
  } else if (savedTheme === 'dark') {
    applyTheme(true);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    applyTheme(true);
  } else {
    applyTheme(false);
  }
};

export function useTheme() {
  onMounted(initTheme);

  return { isDarkMode, applyTheme, toggleTheme, initTheme };
}
