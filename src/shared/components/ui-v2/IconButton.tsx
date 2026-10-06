import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { AnimatedPressable, AnimatedPressableProps } from './AnimatedPressable';
import { useTheme } from '../../theme/ThemeProvider';

export interface IconButtonProps
  extends Omit<AnimatedPressableProps, 'children' | 'contentStyle' | 'style'> {
  icon: React.ReactNode;
  variant?: 'ghost' | 'filled' | 'outline' | 'plain';
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'ghost',
  size = 'md',
  color,
  style,
  ...props
}) => {
  const { theme } = useTheme();
  const resolvedColor = color ?? theme.colors.primary;
  const dimension = { sm: 44, md: 48, lg: 56 }[size];
  return (
    <AnimatedPressable
      {...props}
      pressedScale={0.94}
      elevation={variant === 'plain' ? 0 : 1}
      radius={theme.radii.md}
      hitSlop={8}
      style={style}
      contentStyle={{
        width: dimension,
        height: dimension,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor:
          variant === 'filled'
            ? resolvedColor
            : variant === 'ghost'
            ? theme.colors.primarySoft
            : 'transparent',
        borderWidth: variant === 'outline' ? 1.5 : 0,
        borderColor: resolvedColor,
      }}
    >
      {icon}
    </AnimatedPressable>
  );
};
