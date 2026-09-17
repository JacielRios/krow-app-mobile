import React, { useEffect } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeProvider';
import { Button } from './Button';
import { Text } from './Text';

export interface FeedbackStateProps {
  title: string;
  description?: string;
  kind?: 'empty' | 'error';
  actionLabel?: string;
  onAction?: () => void;
}

export const FeedbackState: React.FC<FeedbackStateProps> = ({ title, description, kind = 'empty', actionLabel, onAction }) => {
  const { theme } = useTheme();
  useEffect(() => {
    if (kind === 'error') AccessibilityInfo.announceForAccessibility(`${title}. ${description ?? ''}`);
  }, [description, kind, title]);
  return (
    <View style={{ paddingVertical: theme.spacing.xxl, alignItems: 'center' }}>
      <MaterialIcons name={kind === 'error' ? 'error-outline' : 'search-off'} size={44} color={kind === 'error' ? theme.colors.status.error : theme.colors.textMuted} />
      <Text variant="title" tone={kind === 'error' ? 'error' : 'primary'} style={{ marginTop: theme.spacing.md, textAlign: 'center' }}>{title}</Text>
      {description ? <Text tone="secondary" style={{ marginTop: theme.spacing.sm, textAlign: 'center' }}>{description}</Text> : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} style={{ marginTop: theme.spacing.lg }} /> : null}
    </View>
  );
};
