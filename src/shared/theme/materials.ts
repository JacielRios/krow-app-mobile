import type { ViewStyle } from 'react-native';
import type { AppTheme } from './themes';
import { createShadow, ElevationLevel } from './elevation';

/** Elevation is reserved for controls floating above a map and modal sheets. */
export const depth = (theme: AppTheme, level: ElevationLevel = 1): ViewStyle =>
  level ? createShadow(level, theme.colors.shadow) : {};

// Compatibility helper: existing consumers now receive an opaque neutral surface.
export const glass = (theme: AppTheme): ViewStyle => ({
  backgroundColor: theme.colors.surfaceRaised,
});

export const canvas = (theme: AppTheme): ViewStyle => ({
  backgroundColor: theme.colors.background,
});
