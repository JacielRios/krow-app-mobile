import { Platform, ViewStyle } from 'react-native';

export type ElevationLevel = 0 | 1 | 2 | 3 | 4;

export const elevationSpecs = {
  0: { y: 0, radius: 0, opacity: 0, elevation: 0 },
  1: { y: 1, radius: 3, opacity: 0.1, elevation: 2 },
  2: { y: 3, radius: 6, opacity: 0.14, elevation: 4 },
  3: { y: 6, radius: 12, opacity: 0.18, elevation: 8 },
  4: { y: 12, radius: 24, opacity: 0.22, elevation: 16 },
} as const;

export const createShadow = (
  level: ElevationLevel,
  shadowColor: string,
): ViewStyle => {
  const spec = elevationSpecs[level];

  return Platform.select<ViewStyle>({
    ios: {
      shadowColor,
      shadowOffset: { width: 0, height: spec.y },
      shadowOpacity: spec.opacity,
      shadowRadius: spec.radius,
    },
    android: {
      elevation: spec.elevation,
      shadowColor,
    },
    default: {},
  })!;
};
