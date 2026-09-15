'use client';

import { SessionProvider } from 'next-auth/react';
import React, { createContext, useContext, useEffect, useState } from 'react';

/* ══════════════════════════════════════════════════════════
   THEME CONTEXT
══════════════════════════════════════════════════════════ */
type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
  isDark: false,
});

export const useTheme = () => useContext(ThemeContext);

/* ══════════════════════════════════════════════════════════
   THEME PROVIDER
   - Lit la préférence depuis localStorage
   - Applique/retire la classe 'dark' sur <html>
   - Respecte la préférence système si aucun choix stocké
══════════════════════════════════════════════════════════ */
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Lire la préférence stockée, sinon préférence système
    const stored = localStorage.getItem('annale229-theme') as Theme | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = stored ?? (systemPrefersDark ? 'dark' : 'light');
    setTheme(resolved);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('annale229-theme', theme);
  }, [theme, mounted]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

/* ══════════════════════════════════════════════════════════
   ROOT PROVIDERS
══════════════════════════════════════════════════════════ */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
