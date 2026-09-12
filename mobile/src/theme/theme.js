// charcoal/onPrimary/textOnDark* are intentionally identical in both themes -
// they represent "always dark" or "always light" surfaces (e.g. the taxi
// brand mark, text sitting on a solid-color button), not theme-relative ones.
const FIXED = {
  onPrimary: '#1C1C1E',
  charcoal: '#1C1C1E',
  charcoalLight: '#2C2C2E',
  charcoalSoft: '#3A3A3D',
  textOnDark: '#FFFFFF',
  textOnDarkMuted: 'rgba(255,255,255,0.68)',
};

export const lightColors = {
  ...FIXED,
  primary: '#fdc700',
  primaryDark: '#987700',
  primarySoft: '#fff6d6',
  secondary: '#00bcff',

  background: '#fafafa',
  surface: '#ffffff',
  surfaceAlt: '#f5f5f5',

  border: '#e5e5e5',
  divider: '#e5e5e5',

  textPrimary: '#0a0a0a',
  textSecondary: '#737373',
  textMuted: '#a1a1a1',

  success: '#1FA463',
  successSoft: '#dbf0e6',
  danger: '#e7000b',
  dangerSoft: '#fbd6d8',
  warning: '#F5A623',
  warningSoft: '#fdf1dc',
  info: '#00bcff',
  infoSoft: '#d6f4ff',
};

export const darkColors = {
  ...FIXED,
  primary: '#ffdf20',
  primaryDark: '#ffe963',
  primarySoft: '#413b19',
  secondary: '#74d4ff',

  background: '#0a0a0a',
  surface: '#171717',
  surfaceAlt: '#262626',

  border: '#282828',
  divider: '#282828',

  textPrimary: '#fafafa',
  textSecondary: '#a1a1a1',
  textMuted: '#737373',

  success: '#1FA463',
  successSoft: '#183025',
  danger: '#ff6467',
  dangerSoft: '#452627',
  warning: '#F5A623',
  warningSoft: '#3f3119',
  info: '#74d4ff',
  infoSoft: '#283941',
};

// Default export kept for any straggler import during the light/dark
// migration - prefer useTheme().colors from ThemeContext everywhere else.
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '800' },
  h2: { fontSize: 22, fontWeight: '700' },
  h3: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '400' },
  bodyBold: { fontSize: 15, fontWeight: '600' },
  caption: { fontSize: 13, fontWeight: '500' },
  small: { fontSize: 12, fontWeight: '500' },
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  raised: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
  },
  button: {
    shadowColor: '#fdc700',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
};

export function getStatusColors(colors) {
  return {
    REQUESTED: { fg: colors.warning, bg: colors.warningSoft },
    ACCEPTED: { fg: colors.info, bg: colors.infoSoft },
    ARRIVED: { fg: colors.info, bg: colors.infoSoft },
    IN_PROGRESS: { fg: colors.success, bg: colors.successSoft },
    COMPLETED: { fg: colors.textSecondary, bg: colors.surfaceAlt },
    CANCELLED: { fg: colors.danger, bg: colors.dangerSoft },
    SCHEDULED: { fg: colors.primaryDark, bg: colors.primarySoft },
  };
}

// Kept for any straggler import - prefer getStatusColors(useTheme().colors).
export const STATUS_COLORS = getStatusColors(lightColors);
