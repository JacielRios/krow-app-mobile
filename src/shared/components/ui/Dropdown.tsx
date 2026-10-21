import { IconButton } from '../ui-v2';
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlatList, View, useWindowDimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeProvider';
import { AnimatedModal, AnimatedPressable, ListRow, Text } from '../ui-v2';

interface DropdownProps {
  label?: string;
  options: string[];
  value: string;
  onSelect: (option: string) => void;
  placeholder?: string;
  error?: string;
  icon?: React.ReactNode;
}
export const Dropdown = ({
  label,
  options,
  value,
  onSelect,
  placeholder = 'Seleccionar opción',
  error,
  icon,
}: DropdownProps) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      {label ? (
        <Text style={{ fontSize: 16, marginBottom: 6 }} tone="secondary">
          {label}
        </Text>
      ) : null}
      <AnimatedPressable
        onPress={() => setVisible(true)}
        feedback="opacity"
        accessibilityLabel={`${label ?? placeholder}: ${
          value || 'Sin selección'
        }`}
        accessibilityState={{ expanded: visible }}
        contentStyle={{
          minHeight: 52,
          padding: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderWidth: 1,
          borderColor: error
            ? theme.colors.status.error
            : theme.colors.controlBorder,
          backgroundColor: theme.colors.surface,
        }}
      >
        {icon}
        <Text tone={value ? 'primary' : 'muted'} style={{ flex: 1 }}>
          {value || placeholder}
        </Text>
        <Icon name="expand-more" size={24} color={theme.colors.textSecondary} />
      </AnimatedPressable>
      {error ? (
        <Text tone="error" variant="caption" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <AnimatedModal
        visible={visible}
        onDismissRequest={() => setVisible(false)}
        sheetStyle={{
          padding: 20,
          paddingBottom: Math.max(32, insets.bottom + 16),
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <Text variant="title" style={{ flex: 1 }} accessibilityRole="header">
            {label ?? placeholder}
          </Text>
          <IconButton
            variant="plain"
            onPress={() => setVisible(false)}
            iconName="close"
            accessibilityLabel="Cerrar"
          />
        </View>
        <FlatList
          data={options}
          keyExtractor={(item, index) => `${index}:${item}`}
          style={{ maxHeight: height * 0.6, flexGrow: 0 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <ListRow
              title={item}
              accessibilityRole="radio"
              selected={item === value}
              onPress={() => {
                onSelect(item);
                setVisible(false);
              }}
            />
          )}
        />
      </AnimatedModal>
    </View>
  );
};
