import { ref, onMounted } from 'vue';

const THEME_COLORS = { dark: '#181818', light: '#ffffff' } as const;

function syncThemeColor(dark: boolean) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? THEME_COLORS.dark : THEME_COLORS.light);
}

export function useTheme() {
  const isDarkMode = ref(
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

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

  onMounted(initTheme);

  return { isDarkMode, applyTheme, toggleTheme, initTheme };
}
