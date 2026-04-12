import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { colors } from '../../theme/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode; // Optional element (e.g. from react-native-vector-icons)
  rightElement?: React.ReactNode; // Optional element for the right side (e.g. email domain)
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  rightElement,
  style,
  ...props
}) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, error ? styles.inputError : null]}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.text.placeholder}
          {...props}
        />
        {rightElement && <View style={styles.rightElementContainer}>{rightElement}</View>}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    color: colors.text.secondary,
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: 8,
    backgroundColor: colors.background,
    minHeight: 50,
  },
  inputError: {
    borderColor: colors.error,
  },
  iconContainer: {
    paddingLeft: 12,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text.primary,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  rightElementContainer: {
    paddingRight: 12,
  },
});
