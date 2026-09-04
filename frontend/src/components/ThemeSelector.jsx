import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeSelector({ align = 'right' }) {
  const { theme, themes, setTheme, mode, toggleMode } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = themes.find((t) => t.id === theme) || themes[0];

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleSelect = (id) => {
    setTheme(id);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2" ref={ref}>
      {/* Light / dark mode toggle */}
      <button
        onClick={toggleMode}
        className="btn-secondary px-3 py-2 text-xs"
        title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-pressed={mode === 'dark'}
      >        {mode === 'dark' ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
        <span className="hidden sm:inline">{mode === 'dark' ? 'Light' : 'Dark'}</span>
      </button>

      {/* Accent color picker */}
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="btn-secondary px-3 py-2 text-xs"
          title="Change accent color"
        >
          <span
            className="w-4 h-4 rounded-full"
            style={{ background: current.gradient }}
          />
          <span className="hidden sm:inline">{current.name}</span>
          <svg className="w-3.5 h-3.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            style={{ transform: open ? 'rotate(180deg)' : undefined }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div
            className={`absolute top-full mt-2 w-56 p-1.5 bg-surface-100 border border-surface-300 rounded-xl shadow-brand z-50 ${align === 'right' ? 'right-0' : 'left-0'}`}
            role="listbox"
          >
            {themes.map((t) => (
              <button
                key={t.id}
                role="option"
                aria-selected={t.id === theme}
                onClick={() => handleSelect(t.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-surface-700 hover:bg-surface-300 transition-colors"
              >
                <span className="w-6 h-6 rounded-full flex-shrink-0" style={{ background: t.gradient }} />
                <span className="flex-1 text-left font-medium">{t.name}</span>
                {t.id === theme && (
                  <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
