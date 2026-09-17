import React from 'react';
import { StyleProp, Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export interface TextProps extends RNTextProps {
  variant?: 'display' | 'title' | 'body' | 'caption';
  tone?: 'primary' | 'secondary' | 'muted' | 'inverse' | 'error';
  style?: StyleProp<TextStyle>;
}

export const Text: React.FC<TextProps> = ({ variant = 'body', tone = 'primary', style, ...props }) => {
  const { theme } = useTheme();
  const variants = {
    display: { fontSize: theme.typography.size.xxxl, fontWeight: theme.typography.weight.bold, lineHeight: 40 },
    title: { fontSize: theme.typography.size.xl, fontWeight: theme.typography.weight.bold, lineHeight: 28 },
    body: { fontSize: theme.typography.size.md, fontWeight: theme.typography.weight.regular, lineHeight: 21 },
    caption: { fontSize: theme.typography.size.sm, fontWeight: theme.typography.weight.regular, lineHeight: 17 },
  } as const;
  const tones = {
    primary: theme.colors.textPrimary,
    secondary: theme.colors.textSecondary,
    muted: theme.colors.textMuted,
    inverse: theme.colors.textInverse,
    error: theme.colors.status.error,
  };
  return <RNText {...props} style={[variants[variant], { color: tones[tone] }, style]} />;
};
