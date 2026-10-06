import React from 'react';
import { StyleSheet, View } from 'react-native';
import { canvas } from '../../theme/materials';
import { useTheme } from '../../theme/ThemeProvider';

export const AmbientBackground = () => {
  const { theme } = useTheme();
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={[StyleSheet.absoluteFillObject, canvas(theme)]}
    />
  );
};
