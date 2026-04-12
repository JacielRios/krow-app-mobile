import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { colors } from '../../theme/colors';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  loading = false,
  style,
  disabled,
  ...props
}) => {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isOutline = variant === 'outline';
  const isText = variant === 'text';

  const getContainerStyle = () => {
    switch (variant) {
      case 'primary':
      case 'secondary':
        return styles.primaryContainer;
      case 'outline':
        return styles.outlineContainer;
      case 'text':
        return styles.textContainer;
      default:
        return styles.primaryContainer;
    }
  };

  const getBackgroundColor = () => {
    if (disabled) return '#A0B4DE';
    if (isPrimary) return colors.primaryLight; // Based on the blue from design
    if (isSecondary) return colors.primary;
    return 'transparent';
  };

  const getTextColor = () => {
    if (isPrimary || isSecondary) return colors.text.inverse;
    return colors.primary;
  };

  return (
    <TouchableOpacity
      style={[
        getContainerStyle(),
        { backgroundColor: getBackgroundColor() },
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }, isText && styles.textVariantText]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  primaryContainer: {
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginVertical: 8,
  },
  outlineContainer: {
    height: 52,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginVertical: 8,
  },
  textContainer: {
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  textVariantText: {
    fontWeight: '500',
    fontSize: 14,
  },
});
