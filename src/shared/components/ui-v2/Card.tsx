import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { Surface } from './Surface';
import { useTheme } from '../../theme/ThemeProvider';
import { glass } from '../../theme/materials';

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
  variant = 'elevated',
  padding = 'md',
  radius = 'lg',
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
  const radiusValue = theme.radii[radius];
  const fill = variant === 'filled' ? theme.colors.primarySoft : undefined;
  const innerStyle: StyleProp<ViewStyle> = [
    glass(theme),
    { padding: paddingValue },
    fill ? { backgroundColor: fill } : {},
    contentStyle,
  ];

  if (onPress) {
    return (
      <AnimatedPressable
        elevation={variant === 'flat' ? 0 : 2}
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
      elevation={variant === 'flat' ? 0 : 2}
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
