import React from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, radii, shadows } from '../../theme/tokens';

export type CardVariant = 'elevated' | 'outlined' | 'filled' | 'flat';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardRadius = 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  radius?: CardRadius;
  onPress?: () => void;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

const PADDING_MAP: Record<CardPadding, number> = {
  none: 0,
  sm: spacing.sm,
  md: spacing.md,
  lg: spacing.lg,
};

const RADIUS_MAP: Record<CardRadius, number> = {
  sm: radii.sm,
  md: radii.md,
  lg: radii.lg,
  xl: radii.xl,
};

const getVariantStyle = (variant: CardVariant): ViewStyle => {
  switch (variant) {
    case 'elevated':
      return { backgroundColor: colors.background, ...shadows.md };
    case 'outlined':
      return { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border.default };
    case 'filled':
      return { backgroundColor: colors.surface };
    case 'flat':
      return { backgroundColor: colors.background };
  }
};

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  padding = 'md',
  radius = 'lg',
  onPress,
  style,
  contentStyle,
}) => {
  const cardStyle: ViewStyle = {
    borderRadius: RADIUS_MAP[radius],
    padding: PADDING_MAP[padding],
    ...getVariantStyle(variant),
  };

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.base,
          cardStyle,
          pressed && styles.pressed,
          style,
        ]}
        onPress={onPress}
      >
        <View style={contentStyle}>{children}</View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.base, cardStyle, style]}>
      <View style={contentStyle}>{children}</View>
    </View>
  );
};

export { Card as CardContainer };

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.82,
  },
});
