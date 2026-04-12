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
  const [visible, setVisible] = useState(false);

  const toggleDropdown = () => setVisible(!visible);

  const handleSelect = (option: string) => {
    onSelect(option);
    setVisible(false);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity
        style={[styles.inputContainer, error ? styles.inputError : null]}
        onPress={toggleDropdown}
        activeOpacity={0.8}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text style={[styles.input, !value && styles.placeholder]}>
          {value || placeholder}
        </Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal visible={visible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.dropdownContainer}>
                <FlatList
                  data={options}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.optionItem}
                      onPress={() => handleSelect(item)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          value === item && styles.optionTextSelected,
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
