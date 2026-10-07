import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
  AccessibilityInfo,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeProvider';
import type { AppTheme } from '../../theme/themes';

export type AlertType = 'error' | 'success' | 'warning' | 'info';

interface CustomAlertProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message: string;
  onClose: () => void;
  confirmText?: string;
}

const getAlertConfig = (type: AlertType, theme: AppTheme) => {
  switch (type) {
    case 'error':
      return { icon: 'error-outline', color: theme.colors.status.error };
    case 'success':
      return {
        icon: 'check-circle-outline',
        color: theme.colors.status.success,
      };
    case 'warning':
      return { icon: 'warning-amber', color: theme.colors.status.warning };
    case 'info':
    default:
      return { icon: 'info-outline', color: theme.colors.status.info };
  }
};

export function CustomAlert({
  visible,
  type = 'error',
  title,
  message,
  onClose,
  confirmText = 'Entendido',
}: CustomAlertProps) {
  const { theme, motionEnabled } = useTheme();
  const { width } = useWindowDimensions();
  const scaleValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      AccessibilityInfo.announceForAccessibility(title + '. ' + message);
      if (!motionEnabled) {
        scaleValue.setValue(1);
        opacityValue.setValue(1);
        return;
      }
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: motionEnabled ? 200 : 0,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 0.8,
          duration: motionEnabled ? 150 : 0,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 0,
          duration: motionEnabled ? 150 : 0,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [motionEnabled, visible, scaleValue, opacityValue, title, message]);

  if (!visible) return null;

  const config = getAlertConfig(type, theme);

  return (
    <Modal
      transparent
      visible={visible}
      animationType={motionEnabled ? 'fade' : 'none'}
      onRequestClose={onClose}
    >
      <View
        style={[styles.overlay, { backgroundColor: theme.colors.backdrop }]}
      >
        <Animated.View
          style={[
            styles.alertContainer,
            {
              backgroundColor: theme.colors.surfaceRaised,
              width: Math.min(width - 48, 480),
            },
            {
              transform: [{ scale: scaleValue }],
              opacity: opacityValue,
            },
          ]}
        >
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: config.color + '1A' },
            ]}
          >
            <Icon name={config.icon} size={40} color={config.color} />
          </View>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            {title}
          </Text>
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            {message}
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: config.color }]}
            onPress={onClose}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={confirmText}
          >
            <Text
              style={[styles.buttonText, { color: theme.colors.textInverse }]}
            >
              {confirmText}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertContainer: {
    backgroundColor: colors.background,
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
});
