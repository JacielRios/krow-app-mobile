import { useMemo } from 'react';
import type { AppTheme } from './themes';
import { useTheme } from './ThemeProvider';

/** One palette for older ride screens while retaining their existing contracts. */
export function legacyColors(theme: AppTheme) {
  const c = theme.colors;
  return {
    primary: c.primary,
    primaryLight: c.primaryPressed,
    primarySoft: c.primarySoft,
    background: c.background,
    surface: c.surface,
    text: {
      primary: c.textPrimary,
      secondary: c.textSecondary,
      inverse: c.onPrimary,
      placeholder: c.textMuted,
      muted: c.textMuted,
    },
    border: { default: c.border, active: c.controlBorder, light: c.border },
    status: c.status,
    error: c.status.error,
    map: {
      background: c.surface,
      route: c.primary,
      polyineOuter: c.background,
      marker: c.primary,
    },
  };
}
export type LegacyColors = ReturnType<typeof legacyColors>;
export function useThemedStyles<T>(factory: (colors: LegacyColors) => T) {
  const { theme } = useTheme();
  return useMemo(() => {
    const colors = legacyColors(theme);
    return { colors, styles: factory(colors) };
  }, [theme, factory]);
}
