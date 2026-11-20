import { useEffect, useState } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(() => {
    try {
      const t = localStorage.getItem('fe-theme');
      return t === 'light' || t === 'dark' ? t : 'system';
    } catch {
      return 'system';
    }
  });
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const fn = () => setSystemDark(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (pref === 'system') delete root.dataset.theme;
    else root.dataset.theme = pref;
    try {
      if (pref === 'system') localStorage.removeItem('fe-theme');
      else localStorage.setItem('fe-theme', pref);
    } catch { /* ignore */ }
    window.dispatchEvent(new Event('fe-theme-change'));
  }, [pref]);

  const resolved: 'light' | 'dark' = pref === 'system' ? (systemDark ? 'dark' : 'light') : pref;
  return { pref, setPref, resolved };
}

/** Текущая тема для компонентов, которым она нужна (например, редактор кода) */
export function useResolvedTheme(): 'light' | 'dark' {
  const read = (): 'light' | 'dark' => {
    const t = document.documentElement.dataset.theme;
    if (t === 'light' || t === 'dark') return t;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    const fn = () => setTheme(read());
    window.addEventListener('fe-theme-change', fn);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', fn);
    return () => {
      window.removeEventListener('fe-theme-change', fn);
      mq.removeEventListener('change', fn);
    };
  }, []);
  return theme;
}
