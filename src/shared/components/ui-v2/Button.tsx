import React from 'react';
import { ActivityIndicator, StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import { AnimatedPressable, AnimatedPressableProps } from './AnimatedPressable';
import { useTheme } from '../../theme/ThemeProvider';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'text' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<AnimatedPressableProps, 'children' | 'contentStyle'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = true,
  leftIcon,
  rightIcon,
  contentStyle,
  labelStyle,
  disabled,
  ...props
}) => {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;
  const sizeConfig = {
    sm: { height: 36, padding: theme.spacing.md, fontSize: theme.typography.size.sm },
    md: { height: 48, padding: theme.spacing.lg, fontSize: theme.typography.size.lg },
    lg: { height: 56, padding: theme.spacing.xl, fontSize: theme.typography.size.xl },
  }[size];
  const filled = variant === 'primary' || variant === 'secondary' || variant === 'destructive';
  const backgroundColor = variant === 'destructive'
    ? theme.colors.status.error
    : variant === 'secondary'
      ? theme.colors.textPrimary
      : variant === 'ghost'
        ? theme.colors.primarySoft
        : variant === 'primary'
          ? theme.colors.primary
          : 'transparent';
  const textColor = filled ? theme.colors.textInverse : theme.colors.primary;

  return (
    <AnimatedPressable
      {...props}
      disabled={isDisabled}
      elevation={variant === 'primary' && !isDisabled ? 1 : 0}
      radius={theme.radii.md}
      style={[{ width: fullWidth ? '100%' : undefined }, props.style]}
      contentStyle={[
        {
          minHeight: sizeConfig.height,
          paddingHorizontal: sizeConfig.padding,
          backgroundColor,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: theme.colors.primary,
          justifyContent: 'center',
        },
        contentStyle,
      ]}
      accessibilityLabel={props.accessibilityLabel ?? title}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <>
            {leftIcon ? <View style={{ marginRight: theme.spacing.sm }}>{leftIcon}</View> : null}
            <Text
              numberOfLines={1}
              style={[
                {
                  color: textColor,
                  fontSize: sizeConfig.fontSize,
                  fontWeight: theme.typography.weight.semibold,
                },
                labelStyle,
              ]}
            >
              {title}
            </Text>
            {rightIcon ? <View style={{ marginLeft: theme.spacing.sm }}>{rightIcon}</View> : null}
          </>
        )}
      </View>
    </AnimatedPressable>
  );
};
