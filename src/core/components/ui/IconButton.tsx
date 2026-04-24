import React from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  TouchableOpacityProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { radii } from '../../theme/tokens';

export type IconButtonVariant = 'ghost' | 'filled' | 'outline' | 'plain';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  icon: React.ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

const SIZE_MAP: Record<IconButtonSize, { container: number; borderRadius: number }> = {
  sm: { container: 32, borderRadius: radii.sm },
  md: { container: 40, borderRadius: radii.md },
  lg: { container: 48, borderRadius: radii.lg },
};

const getVariantStyle = (variant: IconButtonVariant, color: string): ViewStyle => {
  switch (variant) {
    case 'filled':
      return { backgroundColor: color };
    case 'outline':
      return { borderWidth: 1.5, borderColor: color, backgroundColor: 'transparent' };
    case 'ghost':
      return { backgroundColor: `${color}18` };
    case 'plain':
      return { backgroundColor: 'transparent' };
  }
};

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'ghost',
  size = 'md',
  color = colors.primary,
  style,
  disabled,
  ...props
}) => {
  const sizeConfig = SIZE_MAP[size];

  return (
    <TouchableOpacity
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.7}
      disabled={disabled}
      style={[
        styles.base,
        {
          width: sizeConfig.container,
          height: sizeConfig.container,
          borderRadius: sizeConfig.borderRadius,
          opacity: disabled ? 0.4 : 1,
        },
        getVariantStyle(variant, color),
        style,
      ]}
      {...props}
    >
      {icon}
    </TouchableOpacity>
  );
};

export interface IconContainerProps {
  children: React.ReactNode;
  size?: IconButtonSize;
  style?: StyleProp<ViewStyle>;
}

export const IconContainer: React.FC<IconContainerProps> = ({
  children,
  size = 'md',
  style,
}) => {
  const sizeConfig = SIZE_MAP[size];

  return (
    <View
      style={[
        styles.base,
        {
          width: sizeConfig.container,
          height: sizeConfig.container,
          borderRadius: sizeConfig.borderRadius,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
