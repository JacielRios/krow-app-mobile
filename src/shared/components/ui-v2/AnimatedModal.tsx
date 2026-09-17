import React from 'react';
import { Modal, ModalProps, Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { createShadow } from '../../theme/elevation';
import { useTheme } from '../../theme/ThemeProvider';

export interface AnimatedModalProps extends Omit<ModalProps, 'transparent' | 'animationType'> {
  onDismissRequest: () => void;
  sheetStyle?: StyleProp<ViewStyle>;
}

export const AnimatedModal: React.FC<AnimatedModalProps> = ({ children, visible, onDismissRequest, sheetStyle, ...props }) => {
  const { theme, motionEnabled } = useTheme();
  return (
    <Modal {...props} visible={visible} transparent animationType="none" onRequestClose={onDismissRequest} statusBarTranslucent>
      <Animated.View entering={motionEnabled ? FadeIn.duration(theme.motion.duration.normal) : undefined} exiting={motionEnabled ? FadeOut.duration(theme.motion.duration.fast) : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.backdrop }}>
        <Pressable style={{ flex: 1 }} onPress={onDismissRequest} accessibilityRole="button" accessibilityLabel="Cerrar modal" />
        <Animated.View entering={motionEnabled ? SlideInDown.duration(theme.motion.duration.slow) : undefined} exiting={motionEnabled ? SlideOutDown.duration(theme.motion.duration.normal) : undefined} style={[{ maxHeight: '92%', borderTopLeftRadius: theme.radii.xl, borderTopRightRadius: theme.radii.xl, backgroundColor: theme.colors.surfaceRaised }, createShadow(4, theme.colors.shadow), sheetStyle]}>
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};
