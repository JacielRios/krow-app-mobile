import React from 'react';
import { View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeProvider';
import { AnimatedPressable } from './AnimatedPressable';
import { Text } from './Text';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  iconName?: string;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'radio';
}

/** A single accessible action, separated by a hairline rather than a card. */
export function ListRow({
  title,
  subtitle,
  leading,
  iconName,
  trailing,
  children,
  onPress,
  selected,
  disabled,
  accessibilityLabel,
  accessibilityRole = 'button',
}: ListRowProps) {
  const { theme } = useTheme();
  const content = (
    <View
      style={{
        paddingVertical: 16,
        minHeight: 64,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: selected !== undefined ? 12 : 0,
        backgroundColor: selected ? theme.colors.primarySoft : 'transparent',
        borderBottomWidth: 0.5,
        borderBottomColor: theme.colors.border,
      }}
    >
      {leading ??
        (iconName ? (
          <Icon
            name={iconName}
            size={24}
            color={selected ? theme.colors.primary : theme.colors.textSecondary}
            accessible={false}
            importantForAccessibility="no"
          />
        ) : null)}
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text style={{ fontWeight: '600' }}>{title}</Text>
        {subtitle ? (
          <Text variant="caption" tone="secondary">
            {subtitle}
          </Text>
        ) : null}
        {children}
      </View>
      {trailing ??
        (selected !== undefined ? (
          <Icon
            name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
            size={24}
            color={selected ? theme.colors.primary : theme.colors.textMuted}
          />
        ) : onPress ? (
          <Icon name="chevron-right" size={24} color={theme.colors.textMuted} />
        ) : null)}
    </View>
  );
  return onPress ? (
    <AnimatedPressable
      radius={selected !== undefined ? theme.radii.md : 0}
      feedback="opacity"
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={
        accessibilityLabel ?? [title, subtitle].filter(Boolean).join('. ')
      }
      accessibilityRole={accessibilityRole}
      accessibilityState={{
        selected,
        checked: accessibilityRole === 'radio' ? selected : undefined,
      }}
    >
      {content}
    </AnimatedPressable>
  ) : (
    content
  );
}
