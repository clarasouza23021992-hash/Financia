export interface AccentTheme {
  id: string;
  name: string;
  subtitle: string;
  primary: string;
  primaryHover: string;
  primaryActive: string;
  glow: string;
  textOnPrimary: string;
  subtleBg: string;
  borderSubtle: string;
  gradientBadge: string;
  previewBg: string;
}

export const ACCENT_THEMES: AccentTheme[] = [
  {
    id: 'emerald',
    name: 'Menta Esmeralda',
    subtitle: 'Clássico Fintech & Prosperidade',
    primary: '#00C49F',
    primaryHover: '#00B290',
    primaryActive: '#009E7E',
    glow: 'rgba(0, 196, 159, 0.35)',
    textOnPrimary: '#0A1128',
    subtleBg: 'rgba(0, 196, 159, 0.12)',
    borderSubtle: 'rgba(0, 196, 159, 0.35)',
    gradientBadge: 'from-[#00C49F] to-emerald-400',
    previewBg: 'bg-[#00C49F]',
  },
  {
    id: 'nubank',
    name: 'Violeta Ultravioleta',
    subtitle: 'Estilo Nubank & Inovação',
    primary: '#8A2BE2',
    primaryHover: '#7924C7',
    primaryActive: '#681FB0',
    glow: 'rgba(138, 43, 226, 0.40)',
    textOnPrimary: '#FFFFFF',
    subtleBg: 'rgba(138, 43, 226, 0.14)',
    borderSubtle: 'rgba(138, 43, 226, 0.40)',
    gradientBadge: 'from-[#8A2BE2] to-fuchsia-500',
    previewBg: 'bg-[#8A2BE2]',
  },
  {
    id: 'sapphire',
    name: 'Azul Safira Tech',
    subtitle: 'Elegância Executiva & Apple',
    primary: '#2563EB',
    primaryHover: '#1D4ED8',
    primaryActive: '#1E40AF',
    glow: 'rgba(37, 99, 235, 0.35)',
    textOnPrimary: '#FFFFFF',
    subtleBg: 'rgba(37, 99, 235, 0.12)',
    borderSubtle: 'rgba(37, 99, 235, 0.35)',
    gradientBadge: 'from-blue-600 to-cyan-500',
    previewBg: 'bg-[#2563EB]',
  },
  {
    id: 'gold',
    name: 'Dourado Ouro Imperial',
    subtitle: 'Black Titanium & Alta Renda',
    primary: '#E5A93C',
    primaryHover: '#CA8A04',
    primaryActive: '#A16207',
    glow: 'rgba(229, 169, 60, 0.40)',
    textOnPrimary: '#171206',
    subtleBg: 'rgba(229, 169, 60, 0.14)',
    borderSubtle: 'rgba(229, 169, 60, 0.45)',
    gradientBadge: 'from-amber-400 via-yellow-500 to-amber-600',
    previewBg: 'bg-[#E5A93C]',
  },
  {
    id: 'rose',
    name: 'Rosa Coral & Rubi',
    subtitle: 'Vibrante, Afetuoso & Moderno',
    primary: '#F43F5E',
    primaryHover: '#E11D48',
    primaryActive: '#BE123C',
    glow: 'rgba(244, 63, 94, 0.35)',
    textOnPrimary: '#FFFFFF',
    subtleBg: 'rgba(244, 63, 94, 0.12)',
    borderSubtle: 'rgba(244, 63, 94, 0.35)',
    gradientBadge: 'from-rose-500 to-pink-500',
    previewBg: 'bg-[#F43F5E]',
  },
];

const THEME_STORAGE_KEY = 'financas_accent_theme_id';

export const getStoredThemeId = (): string => {
  if (typeof window === 'undefined') return 'emerald';
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'emerald';
  } catch {
    return 'emerald';
  }
};

export const getStoredTheme = (): AccentTheme => {
  const id = getStoredThemeId();
  return ACCENT_THEMES.find(t => t.id === id) || ACCENT_THEMES[0];
};

export const applyTheme = (themeId: string): AccentTheme => {
  const theme = ACCENT_THEMES.find(t => t.id === themeId) || ACCENT_THEMES[0];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme.id);
    } catch {}

    const root = document.documentElement;
    root.setAttribute('data-accent-theme', theme.id);
    root.style.setProperty('--color-brand-primary', theme.primary);
    root.style.setProperty('--color-brand-hover', theme.primaryHover);
    root.style.setProperty('--color-brand-active', theme.primaryActive);
    root.style.setProperty('--color-brand-glow', theme.glow);
    root.style.setProperty('--color-brand-text', theme.textOnPrimary);
    root.style.setProperty('--color-brand-subtle', theme.subtleBg);
    root.style.setProperty('--color-brand-border', theme.borderSubtle);

    window.dispatchEvent(new CustomEvent('accent-theme-changed', { detail: theme }));
  }
  return theme;
};
