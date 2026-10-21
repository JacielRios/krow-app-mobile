import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { Surface } from './Surface';
import { useTheme } from '../../theme/ThemeProvider';

export type CardVariant = 'elevated' | 'outlined' | 'filled' | 'flat';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardRadius = 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  radius?: CardRadius;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'flat',
  padding = 'md',
  radius = 'md',
  onPress,
  style,
  contentStyle,
  accessibilityLabel,
}) => {
  const { theme } = useTheme();
  const paddingValue = {
    none: 0,
    sm: theme.spacing.sm,
    md: theme.spacing.md,
    lg: theme.spacing.lg,
  }[padding];
  const radiusValue = variant === 'flat' ? 0 : theme.radii[radius];
  const fill = variant === 'flat' ? 'transparent' : theme.colors.surface;
  const innerStyle: StyleProp<ViewStyle> = [
    {
      padding: variant === 'flat' ? 0 : paddingValue,
      backgroundColor: fill,
      borderWidth: variant === 'outlined' ? 1 : 0,
      borderColor: theme.colors.border,
    },
    contentStyle,
  ];

  if (onPress) {
    return (
      <AnimatedPressable
        elevation={variant === 'elevated' ? 1 : 0}
        feedback="opacity"
        radius={radiusValue}
        onPress={onPress}
        style={style}
        contentStyle={innerStyle}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
      >
        {children}
      </AnimatedPressable>
    );
  }
  return (
    <Surface
      elevation={variant === 'elevated' ? 1 : 0}
      radius={radiusValue}
      bordered={variant === 'outlined'}
      style={style}
      contentStyle={innerStyle}
    >
      {children}
    </Surface>
  );
};

export { Card as CardContainer };
