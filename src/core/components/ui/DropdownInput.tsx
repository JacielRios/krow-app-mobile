import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  ViewStyle,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme/colors';
import { spacing, radii, typography, shadows } from '../../theme/tokens';

export type DropdownOption = { value: string; label: string } | string;

const normalizeOption = (opt: DropdownOption): { value: string; label: string } =>
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
  const [visible, setVisible] = useState(false);
  const normalizedOptions = options.map(normalizeOption);
  const selectedOption = normalizedOptions.find((o) => o.value === value);

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
        style={[
          styles.trigger,
          { borderColor: getBorderColor(), borderWidth: visible || !!error ? 1.5 : 1 },
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

      <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sheet}>
                {label && <Text style={styles.sheetTitle}>{label}</Text>}
                <FlatList
                  data={normalizedOptions}
                  keyExtractor={(item) => item.value}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const isSelected = item.value === value;
                    if (renderOption) {
                      return (
                        <TouchableOpacity onPress={() => handleSelect(item)}>
                          {renderOption(item, isSelected)}
                        </TouchableOpacity>
                      );
                    }
                    return (
                      <TouchableOpacity
                        style={[styles.option, isSelected && styles.optionSelected]}
                        onPress={() => handleSelect(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                          {item.label}
                        </Text>
                        {isSelected && (
                          <MaterialIcons name="check" size={18} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxHeight: '65%',
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.lg,
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
    fontSize: typography.size.lg,
    color: colors.text.primary,
  },
  optionTextSelected: {
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
});
