import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeProvider';
import { createShadow } from '../../theme/elevation';

interface DropdownProps {
  label?: string;
  options: string[];
  value: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  options,
  value,
  onSelect,
  placeholder = 'Select an option',
  error,
  icon,
}) => {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);

  const toggleDropdown = () => setVisible(!visible);

  const handleSelect = (option: string) => {
    onSelect(option);
    setVisible(false);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>}
      
      <TouchableOpacity
        style={[styles.inputContainer, { backgroundColor: theme.colors.surfaceRaised, borderColor: error ? theme.colors.status.error : theme.colors.border }]}
        onPress={toggleDropdown}
        activeOpacity={0.8}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text style={[styles.input, { color: value ? theme.colors.textPrimary : theme.colors.textMuted }]}>
          {value || placeholder}
        </Text>
      </TouchableOpacity>

      {error && <Text style={[styles.errorText, { color: theme.colors.status.error }]}>{error}</Text>}

      <Modal visible={visible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={[styles.modalOverlay, { backgroundColor: theme.colors.backdrop }]}>
            <TouchableWithoutFeedback>
              <View style={[styles.dropdownContainer, { backgroundColor: theme.colors.surfaceRaised }, createShadow(3, theme.colors.shadow)]}>
                <FlatList
                  data={options}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.optionItem, { borderBottomColor: theme.colors.border }]}
                      onPress={() => handleSelect(item)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: value === item ? theme.colors.primary : theme.colors.textPrimary },
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
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
    marginBottom: 16,
    width: '100%',
  },
  label: {
    color: colors.text.secondary,
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: 8,
    backgroundColor: colors.background,
    minHeight: 50,
  },
  inputError: {
    borderColor: colors.error,
  },
  iconContainer: {
    paddingLeft: 12,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text.primary,
  },
  placeholder: {
    color: colors.text.placeholder,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    width: '80%',
    maxHeight: '50%',
    backgroundColor: colors.background,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  optionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  optionText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  optionTextSelected: {
    fontWeight: 'bold',
    color: colors.primary,
  },
});
