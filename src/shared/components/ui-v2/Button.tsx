import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { AnimatedPressable, AnimatedPressableProps } from './AnimatedPressable';
import { useTheme } from '../../theme/ThemeProvider';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tonal'
  | 'outline'
  | 'ghost'
  | 'text'
  | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends Omit<AnimatedPressableProps, 'children' | 'contentStyle'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  iconName?: string;
  trailingIconName?: string;
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
  iconName,
  trailingIconName,
  contentStyle,
  labelStyle,
  disabled,
  ...props
}) => {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;
  const sizeConfig = {
    sm: {
      height: 48,
      padding: theme.spacing.md,
      fontSize: theme.typography.size.sm,
    },
    md: {
      height: 52,
      padding: theme.spacing.lg,
      fontSize: theme.typography.size.md,
    },
    lg: {
      height: 56,
      padding: theme.spacing.xl,
      fontSize: theme.typography.size.lg,
    },
  }[size];
  const filled =
    variant === 'primary' ||
    variant === 'secondary' ||
    variant === 'destructive';
  const backgroundColor =
    variant === 'destructive'
      ? theme.colors.status.error
      : variant === 'secondary'
      ? theme.colors.textPrimary
      : variant === 'tonal'
      ? theme.colors.primarySoft
      : variant === 'ghost'
      ? theme.colors.surface
      : variant === 'primary'
      ? theme.colors.primary
      : 'transparent';
  const textColor = filled
    ? variant === 'destructive'
      ? theme.colors.onDestructive
      : variant === 'secondary'
      ? theme.colors.onSecondary
      : theme.colors.onPrimary
    : variant === 'ghost'
    ? theme.colors.textPrimary
    : theme.colors.primary;

  return (
    <AnimatedPressable
      {...props}
      disabled={isDisabled}
      elevation={0}
      radius={theme.radii.full}
      stateLayerColor={textColor}
      style={[{ width: fullWidth ? '100%' : undefined }, props.style]}
      contentStyle={[
        {
          minHeight: sizeConfig.height,
          minWidth: theme.touchTarget.minimum,
          paddingHorizontal: sizeConfig.padding,
          backgroundColor,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: theme.colors.controlBorder,
          paddingVertical: theme.spacing.sm,
          justifyContent: 'center',
        },
        contentStyle,
      ]}
      accessibilityLabel={props.accessibilityLabel ?? title}
      accessibilityState={{
        ...props.accessibilityState,
        busy: loading,
        disabled: Boolean(isDisabled),
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {loading ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
            }}
          >
            <ActivityIndicator color={textColor} size="small" />
            <Text
              style={{
                color: textColor,
                fontSize: sizeConfig.fontSize,
                fontWeight: theme.typography.weight.semibold,
                flexShrink: 1,
              }}
            >
              {title}
            </Text>
          </View>
        ) : (
          <>
            {leftIcon || iconName ? (
              <View
                style={{ marginRight: theme.spacing.sm }}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
              >
                {leftIcon ?? (
                  <MaterialIcons
                    name={iconName!}
                    size={20}
                    color={textColor}
                    accessible={false}
                  />
                )}
              </View>
            ) : null}
            <Text
              style={[
                {
                  color: textColor,
                  fontSize: sizeConfig.fontSize,
                  fontWeight: theme.typography.weight.semibold,
                  textAlign: 'center',
                  flexShrink: 1,
                },
                labelStyle,
              ]}
            >
              {title}
            </Text>
            {rightIcon || trailingIconName ? (
              <View
                style={{ marginLeft: theme.spacing.sm }}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
              >
                {rightIcon ?? (
                  <MaterialIcons
                    name={trailingIconName!}
                    size={20}
                    color={textColor}
                    accessible={false}
                  />
                )}
              </View>
            ) : null}
          </>
        )}
      </View>
    </AnimatedPressable>
  );
};
