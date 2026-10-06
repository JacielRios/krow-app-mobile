import { Platform, ViewStyle } from 'react-native';
import type { AppTheme } from './themes';
import { createShadow, ElevationLevel } from './elevation';

/** Native layered shadows; older Android versions retain platform elevation. */
export const depth = (
  theme: AppTheme,
  level: ElevationLevel = 2,
): ViewStyle => {
  if (!level) return {};
  if (Platform.OS === 'android' && Number(Platform.Version) < 28) {
    return createShadow(level, theme.colors.shadow);
  }
  return {
    boxShadow: [
      {
        offsetX: 0,
        offsetY: level * 5,
        blurRadius: level * 12,
        color: theme.dark ? '#00000066' : '#10213D14',
      },
      {
        offsetX: 0,
        offsetY: level,
        blurRadius: level * 3,
        color: theme.dark ? '#00000040' : '#10213D0A',
      },
      {
        offsetX: -2,
        offsetY: -2,
        blurRadius: level * 5,
        color: theme.dark ? '#AAB8CB08' : '#FFFFFFCC',
      },
    ],
  };
};

export const glass = (theme: AppTheme): ViewStyle => ({
  backgroundColor: theme.dark ? '#111D2EF2' : '#FFFFFFEB',
  borderWidth: 1,
  borderColor: theme.dark ? '#AAB8CB30' : '#FFFFFF',
  experimental_backgroundImage: `linear-gradient(145deg, ${
    theme.dark ? '#FFFFFF0D' : '#FFFFFF99'
  }, ${theme.dark ? '#111D2E00' : '#E8F0FC40'})`,
});

export const canvas = (theme: AppTheme): ViewStyle => ({
  backgroundColor: theme.colors.background,
  experimental_backgroundImage: `linear-gradient(155deg, ${theme.colors.background}, ${theme.colors.primarySoft}, ${theme.colors.background})`,
});
