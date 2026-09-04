import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

export interface ThemeDef {
  id: string;
  name: string;
  gradient: [string, string];
}

export const THEMES: ThemeDef[] = [
  { id: 'violet', name: 'Violet', gradient: ['#6366f1', '#a855f7'] },
  { id: 'emerald', name: 'Emerald', gradient: ['#10b981', '#06b6d4'] },
  { id: 'sunset', name: 'Sunset', gradient: ['#f43f5e', '#fb923c'] },
];

const ACCENT_KEY = 'cambridge-accent';
const MODE_KEY = 'cambridge-mode';
const DEFAULT_ACCENT = 'violet';
const DEFAULT_MODE = 'dark';

async function getInitialAccent(): Promise<string> {
  try {
    const stored = await SecureStore.getItemAsync(ACCENT_KEY);
    if (stored && THEMES.some((t) => t.id === stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_ACCENT;
}

async function getInitialMode(): Promise<string> {
  try {
    const stored = await SecureStore.getItemAsync(MODE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_MODE;
}

interface ThemeContextValue {
  theme: string;
  themes: ThemeDef[];
  setTheme: (id: string) => void;
  mode: string;
  toggleMode: () => void;
  setMode: (m: string) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [mode, setModeState] = useState(DEFAULT_MODE);

  useEffect(() => {
    (async () => {
      setAccent(await getInitialAccent());
      setModeState(await getInitialMode());
    })();
  }, []);

  useEffect(() => {
    SecureStore.setItemAsync(ACCENT_KEY, accent).catch(() => {});
  }, [accent]);

  useEffect(() => {
    SecureStore.setItemAsync(MODE_KEY, mode).catch(() => {});
  }, [mode]);

  const setTheme = useCallback((id: string) => {
    if (THEMES.some((t) => t.id === id)) setAccent(id);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((m) => (m === 'dark' ? 'light' : 'dark'));
  }, []);

  const setMode = useCallback((m: string) => {
    if (m === 'light' || m === 'dark') setModeState(m);
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme: accent, themes: THEMES, setTheme, mode, toggleMode, setMode, isDark: mode === 'dark' }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
