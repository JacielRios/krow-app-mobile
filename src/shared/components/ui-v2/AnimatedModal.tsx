import React from 'react';
import {
  Modal,
  ModalProps,
  Pressable,
  StyleProp,
  ViewStyle,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { depth, glass } from '../../theme/materials';
import { useTheme } from '../../theme/ThemeProvider';

export interface AnimatedModalProps
  extends Omit<ModalProps, 'transparent' | 'animationType'> {
  onDismissRequest: () => void;
  sheetStyle?: StyleProp<ViewStyle>;
}

export const AnimatedModal: React.FC<AnimatedModalProps> = ({
  children,
  visible,
  onDismissRequest,
  sheetStyle,
  ...props
}) => {
  const { theme, motionEnabled } = useTheme();
  return (
    <Modal
      {...props}
      visible={visible}
      transparent
      animationType={motionEnabled ? 'slide' : 'none'}
      onRequestClose={onDismissRequest}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: theme.colors.backdrop,
        }}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={onDismissRequest}
          accessibilityRole="button"
          accessibilityLabel="Cerrar modal"
        />
        <View
          collapsable={false}
          accessibilityViewIsModal
          style={[
            {
              maxHeight: '92%',
              borderTopLeftRadius: theme.radii.xl,
              borderTopRightRadius: theme.radii.xl,
              backgroundColor: theme.colors.surfaceRaised,
            },
            glass(theme),
            depth(theme, 4),
            sheetStyle,
          ]}
        >
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
