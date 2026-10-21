import React, { forwardRef, useState } from 'react';
import {
  StyleProp,
  Text,
  TextInput as RNTextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  success?: boolean;
  compact?: boolean;
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
      compact = false,
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
      : theme.colors.controlBorder;
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
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: theme.radii.sm,
            backgroundColor: theme.colors.surface,
            minHeight: rest.multiline && !compact ? 112 : 52,
            borderColor,
            borderWidth: 1,
          }}
        >
          {icon ? (
            <View
              style={{ paddingLeft: theme.spacing.md }}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {icon}
            </View>
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
                textAlignVertical: rest.multiline ? 'top' : 'center',
                minHeight: rest.multiline && !compact ? 110 : 50,
              },
              style,
            ]}
            placeholderTextColor={theme.colors.textMuted}
            selectionColor={theme.colors.primary}
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
            accessibilityState={{
              ...rest.accessibilityState,
              disabled: Boolean(rest.editable === false),
            }}
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
