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
  headerGradient: string;
  headerBorder: string;
  appBgDark: string;
  appBgLight: string;
  cardBgDark: string;
  cardBorderDark: string;
  progressGradient: string;
  titaniumGradient: string;
  accentRgb: string;
}

export const ACCENT_THEMES: AccentTheme[] = [
  {
    id: 'emerald',
    name: 'Menta Esmeralda',
    subtitle: 'Clássico Fintech & Prosperidade',
    primary: '#00C49F',
    primaryHover: '#00B290',
    primaryActive: '#009E7E',
    glow: 'rgba(0, 196, 159, 0.40)',
    textOnPrimary: '#0A1128',
    subtleBg: 'rgba(0, 196, 159, 0.14)',
    borderSubtle: 'rgba(0, 196, 159, 0.38)',
    gradientBadge: 'from-[#00C49F] to-emerald-400',
    previewBg: 'bg-[#00C49F]',
    headerGradient: 'linear-gradient(135deg, #071526 0%, #0A2033 50%, #061322 100%)',
    headerBorder: 'rgba(0, 196, 159, 0.25)',
    appBgDark: '#060F1A',
    appBgLight: '#F3F8F8',
    cardBgDark: '#0B1B2C',
    cardBorderDark: 'rgba(0, 196, 159, 0.22)',
    progressGradient: 'linear-gradient(90deg, #00C49F 0%, #10B981 50%, #34D399 100%)',
    titaniumGradient: 'radial-gradient(120% 120% at 90% 10%, rgba(0, 196, 159, 0.12) 0%, rgba(255, 255, 255, 0.02) 40%, transparent 80%), linear-gradient(135deg, #0F2332 0%, #0A1924 45%, #050E16 100%)',
    accentRgb: '0, 196, 159',
  },
  {
    id: 'nubank',
    name: 'Violeta Ultravioleta',
    subtitle: 'Estilo Nubank & Inovação',
    primary: '#8A2BE2',
    primaryHover: '#7924C7',
    primaryActive: '#681FB0',
    glow: 'rgba(138, 43, 226, 0.45)',
    textOnPrimary: '#FFFFFF',
    subtleBg: 'rgba(138, 43, 226, 0.16)',
    borderSubtle: 'rgba(138, 43, 226, 0.42)',
    gradientBadge: 'from-[#8A2BE2] to-fuchsia-500',
    previewBg: 'bg-[#8A2BE2]',
    headerGradient: 'linear-gradient(135deg, #180529 0%, #280942 50%, #140322 100%)',
    headerBorder: 'rgba(138, 43, 226, 0.32)',
    appBgDark: '#0E0318',
    appBgLight: '#FAF5FF',
    cardBgDark: '#1A092E',
    cardBorderDark: 'rgba(138, 43, 226, 0.25)',
    progressGradient: 'linear-gradient(90deg, #8A2BE2 0%, #A855F7 50%, #D946EF 100%)',
    titaniumGradient: 'radial-gradient(120% 120% at 90% 10%, rgba(138, 43, 226, 0.16) 0%, rgba(255, 255, 255, 0.02) 40%, transparent 80%), linear-gradient(135deg, #240C3B 0%, #180629 45%, #0F031B 100%)',
    accentRgb: '138, 43, 226',
  },
  {
    id: 'sapphire',
    name: 'Azul Safira Tech',
    subtitle: 'Elegância Executiva & Apple',
    primary: '#2563EB',
    primaryHover: '#1D4ED8',
    primaryActive: '#1E40AF',
    glow: 'rgba(37, 99, 235, 0.45)',
    textOnPrimary: '#FFFFFF',
    subtleBg: 'rgba(37, 99, 235, 0.15)',
    borderSubtle: 'rgba(37, 99, 235, 0.40)',
    gradientBadge: 'from-blue-600 to-cyan-500',
    previewBg: 'bg-[#2563EB]',
    headerGradient: 'linear-gradient(135deg, #05132B 0%, #0A224D 50%, #05142E 100%)',
    headerBorder: 'rgba(37, 99, 235, 0.28)',
    appBgDark: '#050E1F',
    appBgLight: '#F3F7FD',
    cardBgDark: '#0B1B38',
    cardBorderDark: 'rgba(37, 99, 235, 0.25)',
    progressGradient: 'linear-gradient(90deg, #2563EB 0%, #3B82F6 50%, #06B6D4 100%)',
    titaniumGradient: 'radial-gradient(120% 120% at 90% 10%, rgba(37, 99, 235, 0.16) 0%, rgba(255, 255, 255, 0.02) 40%, transparent 80%), linear-gradient(135deg, #0F2244 0%, #091730 45%, #050D1D 100%)',
    accentRgb: '37, 99, 235',
  },
  {
    id: 'gold',
    name: 'Dourado Ouro Imperial',
    subtitle: 'Black Titanium & Alta Renda',
    primary: '#E5A93C',
    primaryHover: '#CA8A04',
    primaryActive: '#A16207',
    glow: 'rgba(229, 169, 60, 0.45)',
    textOnPrimary: '#171206',
    subtleBg: 'rgba(229, 169, 60, 0.16)',
    borderSubtle: 'rgba(229, 169, 60, 0.45)',
    gradientBadge: 'from-amber-400 via-yellow-500 to-amber-600',
    previewBg: 'bg-[#E5A93C]',
    headerGradient: 'linear-gradient(135deg, #1A1305 0%, #291E0A 50%, #161104 100%)',
    headerBorder: 'rgba(229, 169, 60, 0.32)',
    appBgDark: '#110D04',
    appBgLight: '#FDFBF5',
    cardBgDark: '#201809',
    cardBorderDark: 'rgba(229, 169, 60, 0.28)',
    progressGradient: 'linear-gradient(90deg, #D97706 0%, #E5A93C 50%, #FBBF24 100%)',
    titaniumGradient: 'radial-gradient(120% 120% at 90% 10%, rgba(229, 169, 60, 0.18) 0%, rgba(255, 255, 255, 0.02) 40%, transparent 80%), linear-gradient(135deg, #2C210C 0%, #1D1507 45%, #100C03 100%)',
    accentRgb: '229, 169, 60',
  },
  {
    id: 'rose',
    name: 'Rosa Coral & Rubi',
    subtitle: 'Vibrante, Afetuoso & Moderno',
    primary: '#F43F5E',
    primaryHover: '#E11D48',
    primaryActive: '#BE123C',
    glow: 'rgba(244, 63, 94, 0.45)',
    textOnPrimary: '#FFFFFF',
    subtleBg: 'rgba(244, 63, 94, 0.15)',
    borderSubtle: 'rgba(244, 63, 94, 0.40)',
    gradientBadge: 'from-rose-500 to-pink-500',
    previewBg: 'bg-[#F43F5E]',
    headerGradient: 'linear-gradient(135deg, #220614 0%, #360B21 50%, #1C0411 100%)',
    headerBorder: 'rgba(244, 63, 94, 0.30)',
    appBgDark: '#12030B',
    appBgLight: '#FDF5F7',
    cardBgDark: '#260B1A',
    cardBorderDark: 'rgba(244, 63, 94, 0.25)',
    progressGradient: 'linear-gradient(90deg, #E11D48 0%, #F43F5E 50%, #FB7185 100%)',
    titaniumGradient: 'radial-gradient(120% 120% at 90% 10%, rgba(244, 63, 94, 0.16) 0%, rgba(255, 255, 255, 0.02) 40%, transparent 80%), linear-gradient(135deg, #330F23 0%, #200816 45%, #12030B 100%)',
    accentRgb: '244, 63, 94',
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

    // CSS Custom Properties for the entire app ("Tudo em conjunto")
    root.style.setProperty('--color-brand-primary', theme.primary);
    root.style.setProperty('--color-brand-hover', theme.primaryHover);
    root.style.setProperty('--color-brand-active', theme.primaryActive);
    root.style.setProperty('--color-brand-glow', theme.glow);
    root.style.setProperty('--color-brand-text', theme.textOnPrimary);
    root.style.setProperty('--color-brand-subtle', theme.subtleBg);
    root.style.setProperty('--color-brand-border', theme.borderSubtle);
    root.style.setProperty('--color-accent-rgb', theme.accentRgb);

    // Full layout styling
    root.style.setProperty('--header-gradient', theme.headerGradient);
    root.style.setProperty('--header-border', theme.headerBorder);
    root.style.setProperty('--app-bg-dark', theme.appBgDark);
    root.style.setProperty('--app-bg-light', theme.appBgLight);
    root.style.setProperty('--card-bg-dark', theme.cardBgDark);
    root.style.setProperty('--card-border-dark', theme.cardBorderDark);
    root.style.setProperty('--progress-gradient', theme.progressGradient);
    root.style.setProperty('--titanium-gradient', theme.titaniumGradient);

    window.dispatchEvent(new CustomEvent('accent-theme-changed', { detail: theme }));
  }
  return theme;
};
