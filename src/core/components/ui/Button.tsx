import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  TouchableOpacityProps,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, radii, typography } from '../../theme/tokens';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'text'
  | 'destructive';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  contentStyle?: ViewStyle;
  labelStyle?: TextStyle;
}

const SIZE_CONFIG: Record<ButtonSize, { height: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { height: 36, paddingHorizontal: spacing.md, fontSize: typography.size.sm },
  md: { height: 48, paddingHorizontal: spacing.lg, fontSize: typography.size.lg },
  lg: { height: 56, paddingHorizontal: spacing.xl, fontSize: typography.size.xl },
};

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = true,
  leftIcon,
  rightIcon,
  style,
  contentStyle,
  labelStyle,
  disabled,
  ...props
}) => {
  const isDisabled = disabled || loading;
  const sizeConfig = SIZE_CONFIG[size];

  const getBackgroundColor = (): string => {
    if (variant === 'primary') return isDisabled ? '#A0B4DE' : colors.primaryLight;
    if (variant === 'secondary') return isDisabled ? '#7B9BD0' : colors.primary;
    if (variant === 'destructive') return isDisabled ? '#F4A5A5' : colors.status.error;
    if (variant === 'ghost') return `${colors.primary}12`;
    return 'transparent';
  };

  const getBorderStyle = (): ViewStyle => {
    if (variant === 'outline') {
      return {
        borderWidth: 1.5,
        borderColor: isDisabled ? colors.border.default : colors.primary,
      };
    }
    return {};
  };

  const getTextColor = (): string => {
    if (variant === 'primary' || variant === 'secondary' || variant === 'destructive') {
      return colors.text.inverse;
    }
    return isDisabled ? colors.text.muted : colors.primary;
  };

  const textColor = getTextColor();

  return (
    <TouchableOpacity
      style={[
        styles.base,
        {
          height: sizeConfig.height,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          backgroundColor: getBackgroundColor(),
          width: fullWidth ? '100%' : undefined,
        },
        getBorderStyle(),
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.75}
      {...props}
    >
      <View style={[styles.content, contentStyle]}>
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <>
            {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
            <Text
              style={[
                styles.label,
                { color: textColor, fontSize: sizeConfig.fontSize },
                labelStyle,
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.xs,
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: typography.weight.semibold,
  },
  iconLeft: {
    marginRight: spacing.xs + 2,
  },
  iconRight: {
    marginLeft: spacing.xs + 2,
  },
});
