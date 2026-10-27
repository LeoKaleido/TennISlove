// Tema chiaro/scuro scelto dal profilo (D-028). Preferenza solo locale, per dispositivo.

export type Theme = 'light' | 'dark';

const KEY = 'atp-theme';

export function getTheme(): Theme {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // storage non disponibile: si usa il tema di sistema
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const listeners = new Set<() => void>();

/** Per chi mostra il tema (profilo, barra laterale): avvisato a ogni cambio */
export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // ignorato
  }
  document.documentElement.dataset.theme = theme;
  listeners.forEach((l) => l());
}

export function applyStoredTheme() {
  document.documentElement.dataset.theme = getTheme();
}
