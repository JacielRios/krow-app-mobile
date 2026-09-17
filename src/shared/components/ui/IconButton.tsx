import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { IconButton } from '../ui-v2/IconButton';
import { useTheme } from '../../theme/ThemeProvider';

export { IconButton };
export type { IconButtonProps } from '../ui-v2/IconButton';
export type IconButtonVariant = 'ghost' | 'filled' | 'outline' | 'plain';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconContainerProps {
  children: React.ReactNode;
  size?: IconButtonSize;
  style?: StyleProp<ViewStyle>;
}

export const IconContainer: React.FC<IconContainerProps> = ({ children, size = 'md', style }) => {
  const { theme } = useTheme();
  const dimension = { sm: 36, md: 44, lg: 48 }[size];
  return (
    <View style={[{ width: dimension, height: dimension, borderRadius: theme.radii.md, justifyContent: 'center', alignItems: 'center' }, style]}>
      {children}
    </View>
  );
};
