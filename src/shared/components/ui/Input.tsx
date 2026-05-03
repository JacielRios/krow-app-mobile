import React, { forwardRef, useState } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, radii, typography } from '../../theme/tokens';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  success?: boolean;
  containerStyle?: ViewStyle;
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

    const getBorderColor = (): string => {
      if (error) return colors.status.error;
      if (success) return colors.status.success;
      if (focused) return colors.border.active;
      return colors.border.default;
    };

    const getBorderWidth = (): number => (focused || !!error || success ? 1.5 : 1);

    return (
      <View style={[styles.container, containerStyle]}>
        {label && <Text style={styles.label}>{label}</Text>}
        <View
          style={[
            styles.inputContainer,
            { borderColor: getBorderColor(), borderWidth: getBorderWidth() },
          ]}
        >
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <RNTextInput
            ref={ref}
            style={[styles.input, style]}
            placeholderTextColor={colors.text.placeholder}
            secureTextEntry={secureTextEntry}
            autoCapitalize={autoCapitalize ?? (secureTextEntry ? 'none' : undefined)}
            autoCorrect={autoCorrect ?? (secureTextEntry ? false : undefined)}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            {...rest}
          />
          {rightElement && <View style={styles.rightElementContainer}>{rightElement}</View>}
        </View>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : helperText ? (
          <Text style={styles.helperText}>{helperText}</Text>
        ) : null}
      </View>
    );
  },
);

Input.displayName = 'Input';

export { Input as TextInput };

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    width: '100%',
  },
  label: {
    color: colors.text.secondary,
    marginBottom: 6,
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.background,
    minHeight: 50,
  },
  iconContainer: {
    paddingLeft: spacing.md,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: typography.size.lg,
    color: colors.text.primary,
  },
  rightElementContainer: {
    paddingRight: spacing.md,
  },
  errorText: {
    color: colors.status.error,
    fontSize: typography.size.sm,
    marginTop: spacing.xs,
  },
  helperText: {
    color: colors.text.muted,
    fontSize: typography.size.sm,
    marginTop: spacing.xs,
  },
});
