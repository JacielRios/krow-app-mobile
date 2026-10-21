import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { IconButton } from './IconButton';
import { useTheme } from '../../theme/ThemeProvider';
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  actions,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: 4, marginBottom: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {onBack && (
          <IconButton
            iconName="arrow-back"
            color={theme.colors.textPrimary}
            variant="plain"
            onPress={onBack}
            accessibilityLabel="Volver a la pantalla anterior"
            style={{ marginLeft: -12 }}
          />
        )}
        <Text
          variant={onBack ? 'title' : 'display'}
          accessibilityRole="header"
          style={[
            { flex: 1 },
            onBack ? { fontSize: 24, lineHeight: 30 } : undefined,
          ]}
        >
          {title}
        </Text>
        {actions ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {actions}
          </View>
        ) : null}
      </View>
      {subtitle && <Text tone="secondary">{subtitle}</Text>}
    </View>
  );
}
