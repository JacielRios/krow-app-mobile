import React, { forwardRef, useState } from 'react';
import {
  StyleProp,
  Text,
  TextInput as RNTextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { depth } from '../../theme/materials';
import { useTheme } from '../../theme/ThemeProvider';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  success?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input = forwardRef<RNTextInput, InputProps>(
  (
    {
      label,
      error,
      helperText,
      icon,
      rightElement,
      style,
      containerStyle,
      success,
      secureTextEntry,
      autoCapitalize,
      autoCorrect,
      onFocus,
      onBlur,
      ...rest
    },
    ref,
  ) => {
    const [focused, setFocused] = useState(false);
    const { theme } = useTheme();
    const borderColor = error
      ? theme.colors.status.error
      : success
      ? theme.colors.status.success
      : focused
      ? theme.colors.primary
      : theme.colors.border;
    return (
      <View
        style={[
          { marginBottom: theme.spacing.md, width: '100%' },
          containerStyle,
        ]}
      >
        {label ? (
          <Text
            style={{
              color: theme.colors.textSecondary,
              marginBottom: 6,
              fontSize: theme.typography.size.md,
              fontWeight: theme.typography.weight.medium,
            }}
          >
            {label}
          </Text>
        ) : null}
        <View
          style={{
            ...depth(theme, 1),
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.surfaceRaised,
            minHeight: 50,
            borderColor,
            borderWidth: focused || error || success ? 1.5 : 1,
          }}
        >
          {icon ? (
            <View style={{ paddingLeft: theme.spacing.md }}>{icon}</View>
          ) : null}
          <RNTextInput
            {...rest}
            accessibilityLabel={
              rest.accessibilityLabel ?? label ?? rest.placeholder
            }
            ref={ref}
            style={[
              {
                flex: 1,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm + 4,
                fontSize: theme.typography.size.lg,
                color: theme.colors.textPrimary,
              },
              style,
            ]}
            placeholderTextColor={theme.colors.textMuted}
            secureTextEntry={secureTextEntry}
            autoCapitalize={
              autoCapitalize ?? (secureTextEntry ? 'none' : undefined)
            }
            autoCorrect={autoCorrect ?? (secureTextEntry ? false : undefined)}
            onFocus={event => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={event => {
              setFocused(false);
              onBlur?.(event);
            }}
            accessibilityState={{ disabled: Boolean(rest.editable === false) }}
          />
          {rightElement ? (
            <View style={{ paddingRight: theme.spacing.md }}>
              {rightElement}
            </View>
          ) : null}
        </View>
        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            style={{
              color: theme.colors.status.error,
              fontSize: theme.typography.size.sm,
              marginTop: theme.spacing.xs,
            }}
          >
            {error}
          </Text>
        ) : helperText ? (
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.typography.size.sm,
              marginTop: theme.spacing.xs,
            }}
          >
            {helperText}
          </Text>
        ) : null}
      </View>
    );
  },
);

Input.displayName = 'Input';
export { Input as TextInput };
