import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export const Divider: React.FC<ViewProps> = ({ style, ...props }) => {
  const { theme } = useTheme();
  return <View {...props} style={[{ height: 1, backgroundColor: theme.colors.border }, style]} />;
};
