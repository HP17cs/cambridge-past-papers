import { THEMES } from '../contexts/ThemeContext';

export interface AppColors {
  accent: string;
  accentSoft: string;
  gradient: [string, string];
  bg: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  subtext: string;
  good: string;
  bad: string;
  warn: string;
  inputBg: string;
}

const ACCENT_MAP: Record<string, string> = {
  violet: '#7c3aed',
  emerald: '#10b981',
  sunset: '#f43f5e',
};

export function getTheme(shade: number): string {
  // return accent color; shade 500 default
  return '';
}

export function accentColor(theme: string): string {
  return ACCENT_MAP[theme] || ACCENT_MAP.violet;
}

export function gradientColors(theme: string): [string, string] {
  const t = THEMES.find((x) => x.id === theme);
  return t ? t.gradient : THEMES[0].gradient;
}

export function palette(theme: string, isDark: boolean): AppColors {
  const accent = accentColor(theme);
  const grad = gradientColors(theme);
  if (isDark) {
    return {
      accent,
      accentSoft: accent + '33',
      gradient: grad,
      bg: '#0b0f1a',
      card: '#151b2d',
      border: '#232b45',
      text: '#ecedf3',
      textMuted: '#9aa3bd',
      subtext: '#7c86a3',
      good: '#34d399',
      bad: '#f87171',
      warn: '#fbbf24',
      inputBg: '#10162a',
    };
  }
  return {
    accent,
    accentSoft: accent + '1f',
    gradient: grad,
    bg: '#f4f5fb',
    card: '#ffffff',
    border: '#e3e6f0',
    text: '#171b2b',
    textMuted: '#525a78',
    subtext: '#8a91ad',
    good: '#10b981',
    bad: '#ef4444',
    warn: '#f59e0b',
    inputBg: '#eef0f8',
  };
}
