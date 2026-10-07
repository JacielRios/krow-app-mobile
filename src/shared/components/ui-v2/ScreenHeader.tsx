import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
export function ScreenHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  return (
    <View style={{ gap: 8, marginBottom: 24 }}>
      {onBack && (
        <Button
          title="Volver"
          variant="ghost"
          fullWidth={false}
          onPress={onBack}
          accessibilityLabel="Volver a la pantalla anterior"
          style={{ alignSelf: 'flex-start' }}
        />
      )}
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      {subtitle && <Text tone="secondary">{subtitle}</Text>}
    </View>
  );
}
