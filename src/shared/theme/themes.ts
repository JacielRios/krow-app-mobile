import { motion, radii, spacing, touchTarget, typography } from './tokens';

const status = {
  error: '#C82D24',
  success: '#11734C',
  warning: '#8A5E00',
  info: '#2168B2',
} as const;

export const lightTheme = {
  dark: false,
  colors: {
    background: '#FFFFFF',
    surface: '#F4F4F5',
    surfaceRaised: '#FFFFFF',
    surfaceOverlay: '#EBEBED',
    textPrimary: '#171719',
    textSecondary: '#626269',
    textMuted: '#6C6C73',
    textInverse: '#FFFFFF',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onDestructive: '#FFFFFF',
    primary: '#174F9C',
    primaryPressed: '#103E7D',
    primarySoft: '#E8F0FC',
    border: '#E5E5E7',
    controlBorder: '#8B8B93',
    shadow: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.45)',
    skeleton: '#E5E5E7',
    status,
  },
  spacing,
  radii,
  typography,
  motion,
  touchTarget,
} as const;

export const darkTheme = {
  ...lightTheme,
  dark: true,
  colors: {
    background: '#0A0A0A',
    surface: '#1C1C1E',
    surfaceRaised: '#2C2C2E',
    surfaceOverlay: '#38383A',
    textPrimary: '#F5F5F7',
    textSecondary: '#B5B5BC',
    textMuted: '#A0A0A8',
    textInverse: '#0A0A0A',
    onPrimary: '#0A0A0A',
    onSecondary: '#0A0A0A',
    onDestructive: '#0A0A0A',
    primary: '#7DAEFF',
    primaryPressed: '#91BBF7',
    primarySoft: '#172840',
    border: '#333336',
    controlBorder: '#82828A',
    shadow: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.68)',
    skeleton: '#2C2C2E',
    status: {
      error: '#FF8A80',
      success: '#5DD6A8',
      warning: '#FFD166',
      info: '#75B8FA',
    },
  },
} as const;

export type AppTheme = typeof lightTheme | typeof darkTheme;
export type ThemePreference = 'system' | 'light' | 'dark';
