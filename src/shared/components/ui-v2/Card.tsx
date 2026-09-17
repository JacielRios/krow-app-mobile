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
}

export const Card: React.FC<CardProps> = ({ children, variant = 'elevated', padding = 'md', radius = 'lg', onPress, style, contentStyle }) => {
  const { theme } = useTheme();
  const paddingValue = { none: 0, sm: theme.spacing.sm, md: theme.spacing.md, lg: theme.spacing.lg }[padding];
  const radiusValue = theme.radii[radius];
  const fill = variant === 'filled' ? theme.colors.surfaceOverlay : theme.colors.surfaceRaised;
  const innerStyle: StyleProp<ViewStyle> = [{ padding: paddingValue, backgroundColor: fill }, contentStyle];

  if (onPress) {
    return (
      <AnimatedPressable elevation={variant === 'elevated' ? 2 : 0} radius={radiusValue} onPress={onPress} style={style} contentStyle={[{ backgroundColor: fill, borderWidth: variant === 'outlined' ? 1 : 0, borderColor: theme.colors.border }, innerStyle]}>
        {children}
      </AnimatedPressable>
    );
  }
  return <Surface elevation={variant === 'elevated' ? 2 : 0} radius={radiusValue} bordered={variant === 'outlined'} style={style} contentStyle={innerStyle}>{children}</Surface>;
};

export { Card as CardContainer };
