import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

// Accent color themes. These control the primary/accent hues and are
// independent of the light/dark mode toggle.
const THEMES = [
  { id: 'violet', name: 'Violet', gradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' },
  { id: 'emerald', name: 'Emerald', gradient: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)' },
  { id: 'sunset', name: 'Sunset', gradient: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)' },
];

// Backward compat: legacy theme ids map to a (mode, accent) pair so any
// previously-saved 'cambridge-theme' value still resolves.
const LEGACY_THEMES = {
  'dark-violet': { mode: 'dark', accent: 'violet' },
  'cyber-emerald': { mode: 'dark', accent: 'emerald' },
  'sunset-warmth': { mode: 'dark', accent: 'sunset' },
};

const ACCENT_KEY = 'cambridge-accent';
const MODE_KEY = 'cambridge-mode';
const DEFAULT_ACCENT = 'violet';
const DEFAULT_MODE = 'dark';

function getInitialAccent() {
  try {
    const stored = localStorage.getItem(ACCENT_KEY);
    if (stored && THEMES.some((t) => t.id === stored)) return stored;
    // Migrate legacy stored value if present.
    const legacy = localStorage.getItem('cambridge-theme');
    if (legacy && LEGACY_THEMES[legacy]) return LEGACY_THEMES[legacy].accent;
  } catch (e) {
    /* ignore */
  }
  return DEFAULT_ACCENT;
}

function getInitialMode() {
  try {
    const stored = localStorage.getItem(MODE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    // Migrate legacy stored value if present.
    const legacy = localStorage.getItem('cambridge-theme');
    if (legacy && LEGACY_THEMES[legacy]) return LEGACY_THEMES[legacy].mode;
  } catch (e) {
    /* ignore */
  }
  return DEFAULT_MODE;
}

function applyTheme(accentId, mode) {
  const root = document.documentElement;
  root.classList.toggle('dark', mode === 'dark');
  root.setAttribute('data-theme', accentId);
  root.setAttribute('data-mode', mode);
  try {
    localStorage.setItem(ACCENT_KEY, accentId);
    localStorage.setItem(MODE_KEY, mode);
    // Remove the legacy key once migrated so it cannot override a later choice.
    localStorage.removeItem('cambridge-theme');
  } catch (e) {
    /* ignore */
  }
}

export function ThemeProvider({ children }) {
  const [accent, setAccent] = useState(getInitialAccent);
  const [mode, setMode] = useState(getInitialMode);

  useEffect(() => {
    applyTheme(accent, mode);
  }, [accent, mode]);

  const setTheme = useCallback((id) => {
    if (THEMES.some((t) => t.id === id)) setAccent(id);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((m) => (m === 'dark' ? 'light' : 'dark'));
  }, []);

  const setModeByName = useCallback((m) => {
    if (m === 'light' || m === 'dark') setMode(m);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: accent,
        themes: THEMES,
        setTheme,
        mode,
        toggleMode,
        setMode: setModeByName,
        isDark: mode === 'dark',
      }}
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
