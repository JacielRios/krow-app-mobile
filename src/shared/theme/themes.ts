import { motion, radii, spacing, touchTarget, typography } from './tokens';

const status = {
  error: '#D92D20',
  success: '#16875B',
  warning: '#D99B00',
  info: '#2474C6',
} as const;

export const lightTheme = {
  dark: false,
  colors: {
    background: '#F7F9FC',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    surfaceOverlay: '#EEF3F9',
    textPrimary: '#10213D',
    textSecondary: '#526078',
    textMuted: '#738096',
    textInverse: '#FFFFFF',
    primary: '#174F9C',
    primaryPressed: '#103E7D',
    primarySoft: '#E8F0FC',
    border: '#DCE3ED',
    shadow: '#10213D',
    backdrop: 'rgba(9, 19, 34, 0.52)',
    skeleton: '#DCE5F0',
    status,
  },
  spacing,
  radii: { ...radii, sm: 12, md: 18, lg: 24, xl: 32 },
  typography,
  motion,
  touchTarget,
} as const;

export const darkTheme = {
  ...lightTheme,
  dark: true,
  colors: {
    background: '#09111E',
    surface: '#111D2E',
    surfaceRaised: '#18263A',
    surfaceOverlay: '#213149',
    textPrimary: '#F3F6FA',
    textSecondary: '#AAB8CB',
    textMuted: '#8291A7',
    textInverse: '#09111E',
    primary: '#72A7F4',
    primaryPressed: '#91BBF7',
    primarySoft: '#1A3558',
    border: '#2B3B52',
    shadow: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.68)',
    skeleton: '#2A3A51',
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
