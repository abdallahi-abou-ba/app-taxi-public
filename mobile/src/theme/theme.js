export const colors = {
  primary: '#FFC629',
  primaryDark: '#E6A800',
  primarySoft: '#FFF3D1',
  onPrimary: '#1C1C1E',

  charcoal: '#1C1C1E',
  charcoalLight: '#2C2C2E',
  charcoalSoft: '#3A3A3D',

  background: '#F7F7F9',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F1F4',

  border: '#E7E7EA',
  divider: '#ECECEF',

  textPrimary: '#1C1C1E',
  textSecondary: '#6C6C72',
  textMuted: '#9B9BA1',
  textOnDark: '#FFFFFF',
  textOnDarkMuted: 'rgba(255,255,255,0.68)',

  success: '#1FA463',
  successSoft: '#E4F7ED',
  danger: '#E5484D',
  dangerSoft: '#FCE8E8',
  warning: '#F5A623',
  warningSoft: '#FDF1DC',
  info: '#3478F6',
  infoSoft: '#E8F0FE',
};

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
    shadowColor: '#FFC629',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const STATUS_COLORS = {
  REQUESTED: { fg: colors.warning, bg: colors.warningSoft },
  ACCEPTED: { fg: colors.info, bg: colors.infoSoft },
  ARRIVED: { fg: colors.info, bg: colors.infoSoft },
  IN_PROGRESS: { fg: colors.success, bg: colors.successSoft },
  COMPLETED: { fg: colors.textSecondary, bg: colors.surfaceAlt },
  CANCELLED: { fg: colors.danger, bg: colors.dangerSoft },
  SCHEDULED: { fg: colors.primaryDark, bg: colors.primarySoft },
};
