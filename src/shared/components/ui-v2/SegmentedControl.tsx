import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { AnimatedPressable } from './AnimatedPressable';
import { Text } from './Text';

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const { theme } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        padding: 4,
        borderRadius: theme.radii.lg,
        backgroundColor: theme.colors.surface,
      }}
    >
      {options.map(option => (
        <AnimatedPressable
          key={option.value}
          feedback="opacity"
          style={{ flex: 1 }}
          radius={theme.radii.page}
          onPress={() => onChange(option.value)}
          accessibilityRole="tab"
          accessibilityLabel={option.label}
          accessibilityState={{ selected: option.value === value }}
          contentStyle={{
            minHeight: 48,
            paddingHorizontal: 6,
            paddingVertical: 10,
            justifyContent: 'center',
            backgroundColor:
              option.value === value ? theme.colors.primarySoft : 'transparent',
          }}
        >
          <Text
            variant="caption"
            tone={option.value === value ? 'primary' : 'secondary'}
            style={{
              textAlign: 'center',
              fontWeight: '600',
              color:
                option.value === value
                  ? theme.colors.primary
                  : theme.colors.textSecondary,
            }}
          >
            {option.label}
          </Text>
        </AnimatedPressable>
      ))}
    </View>
  );
}
