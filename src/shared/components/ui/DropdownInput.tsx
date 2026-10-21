import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ViewStyle,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useThemedStyles, type LegacyColors } from '../../theme/legacyTheme';
import { AnimatedModal } from '../ui-v2/AnimatedModal';
import { IconButton } from '../ui-v2/IconButton';
import { spacing, radii, typography } from '../../theme/tokens';

export type DropdownOption = { value: string; label: string } | string;

const normalizeOption = (
  opt: DropdownOption,
): { value: string; label: string } =>
  typeof opt === 'string' ? { value: opt, label: opt } : opt;

export interface DropdownInputProps {
  label?: string;
  options: DropdownOption[];
  value?: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  containerStyle?: ViewStyle;
  renderOption?: (
    option: { value: string; label: string },
    selected: boolean,
  ) => React.ReactNode;
}

export const DropdownInput: React.FC<DropdownInputProps> = ({
  label,
  options,
  value,
  onSelect,
  placeholder = 'Seleccionar opción',
  error,
  helperText,
  icon,
  disabled = false,
  containerStyle,
  renderOption,
}) => {
  const { styles, colors } = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  const [visible, setVisible] = useState(false);
  const normalizedOptions = options.map(normalizeOption);
  const selectedOption = normalizedOptions.find(o => o.value === value);

  const handleSelect = (opt: { value: string; label: string }) => {
    onSelect(opt.value);
    setVisible(false);
  };

  const getBorderColor = (): string => {
    if (error) return colors.status.error;
    if (visible) return colors.border.active;
    return colors.border.default;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? placeholder}: ${
          selectedOption?.label ?? 'Sin selección'
        }`}
        accessibilityState={{ disabled, expanded: visible }}
        style={[
          styles.trigger,
          {
            borderColor: getBorderColor(),
            borderWidth: visible || !!error ? 1.5 : 1,
          },
          disabled && styles.triggerDisabled,
        ]}
        onPress={() => !disabled && setVisible(true)}
        activeOpacity={0.8}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text
          style={[styles.triggerText, !selectedOption && styles.placeholder]}
          numberOfLines={1}
        >
          {selectedOption?.label ?? placeholder}
        </Text>
        <MaterialIcons
          name={visible ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={20}
          color={disabled ? colors.text.muted : colors.text.secondary}
          style={styles.chevron}
        />
      </TouchableOpacity>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
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
            gap: 12,
            marginBottom: 8,
          }}
        >
          <Text
            style={[styles.sheetTitle, { flex: 1, padding: 0 }]}
            accessibilityRole="header"
          >
            {label ?? placeholder}
          </Text>
          <IconButton
            iconName="close"
            variant="plain"
            accessibilityLabel="Cerrar opciones"
            onPress={() => setVisible(false)}
          />
        </View>
        <FlatList
          style={{ maxHeight: 400 }}
          data={normalizedOptions}
          keyExtractor={item => item.value}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = item.value === value;
            if (renderOption) {
              return (
                <TouchableOpacity
                  accessibilityRole="radio"
                  accessibilityLabel={item.label}
                  accessibilityState={{ checked: isSelected }}
                  style={{ minHeight: 48, justifyContent: 'center' }}
                  onPress={() => handleSelect(item)}
                >
                  {renderOption(item, isSelected)}
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                accessibilityRole="radio"
                accessibilityLabel={item.label}
                accessibilityState={{ checked: isSelected }}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
                {isSelected && (
                  <MaterialIcons
                    name="check"
                    size={18}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            );
          }}
        />
      </AnimatedModal>
    </View>
  );
};

const createStyles = (colors: LegacyColors) =>
  StyleSheet.create({
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
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.background,
      minHeight: 50,
    },
    triggerDisabled: {
      backgroundColor: colors.surface,
    },
    iconContainer: {
      paddingLeft: spacing.md,
    },
    triggerText: {
      flex: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
      fontSize: typography.size.lg,
      color: colors.text.primary,
    },
    placeholder: {
      color: colors.text.placeholder,
    },
    chevron: {
      marginRight: spacing.sm,
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
    sheetTitle: {
      fontSize: typography.size.md,
      fontWeight: typography.weight.semibold,
      color: colors.text.primary,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
    },
    option: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
    },
    optionSelected: {
      backgroundColor: colors.surface,
    },
    optionText: {
      flex: 1,
      flexShrink: 1,
      marginRight: spacing.sm,
      fontSize: typography.size.lg,
      color: colors.text.primary,
    },
    optionTextSelected: {
      fontWeight: typography.weight.semibold,
      color: colors.primary,
    },
  });
