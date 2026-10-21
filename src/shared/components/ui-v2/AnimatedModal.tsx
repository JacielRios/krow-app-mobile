import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from 'react';
import {
  Modal,
  ModalProps,
  Pressable,
  StyleProp,
  ViewStyle,
  View,
  Text as NativeText,
  KeyboardAvoidingView,
  Animated,
  AccessibilityInfo,
  findNodeHandle,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { useModalPresence } from './useModalPresence';
import { DialogLayerContext, modalLayers } from './modalLayers';
import { dialogStore } from './dialogService';

// Closing content stays visible during its exit, but its requests must stop now.
export const ModalVisibilityContext = createContext(true);

export interface AnimatedModalProps
  extends Omit<ModalProps, 'transparent' | 'animationType'> {
  onDismissRequest: () => void;
  sheetStyle?: StyleProp<ViewStyle>;
  initialFocusRef?: React.RefObject<View | NativeText | null>;
  presentation?: 'sheet' | 'dialog';
  dismissible?: boolean;
  embedded?: boolean;
}

export const AnimatedModal: React.FC<AnimatedModalProps> = ({
  children,
  visible,
  onDismissRequest,
  sheetStyle,
  onShow,
  initialFocusRef,
  presentation = 'sheet',
  dismissible = true,
  embedded = false,
  ...props
}) => {
  const { theme, motionEnabled } = useTheme();
  const insets = useSafeAreaInsets();
  const centered = presentation === 'dialog';
  const layer = useRef(Symbol('modal')).current;
  const Overlay = useContext(DialogLayerContext);
  const dialog = useSyncExternalStore(
    dialogStore.subscribe,
    dialogStore.getSnapshot,
  );
  const {
    presented,
    progress,
    onShow: show,
  } = useModalPresence(Boolean(visible), motionEnabled);
  useLayoutEffect(() => {
    if (!presented || centered) return;
    modalLayers.open(layer);
    return () => modalLayers.close(layer);
  }, [presented, centered, layer]);
  const lastContent = useRef(children);
  useLayoutEffect(() => {
    if (visible) lastContent.current = children;
  }, [visible, children]);
  useEffect(() => {
    if (!embedded || !visible || !presented) return;
    const target = initialFocusRef?.current
      ? findNodeHandle(initialFocusRef.current)
      : null;
    if (target) AccessibilityInfo.setAccessibilityFocus(target);
  }, [embedded, visible, presented, initialFocusRef]);
  if (!presented) return null;
  const body = (
    <KeyboardAvoidingView
      behavior="padding"
      accessibilityViewIsModal={embedded}
      style={[
        embedded ? StyleSheet.absoluteFill : { flex: 1 },
        {
          justifyContent: centered ? 'center' : 'flex-end',
          alignItems: centered ? 'center' : 'stretch',
          paddingHorizontal: centered ? 20 : 0,
          paddingTop: centered ? insets.top + 16 : 0,
          paddingBottom: centered ? insets.bottom + 16 : 0,
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.colors.backdrop, opacity: progress },
        ]}
      />
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onDismissRequest}
        disabled={!visible || !dismissible}
        accessible={false}
        importantForAccessibility="no"
      />
      <Animated.View
        collapsable={false}
        accessibilityViewIsModal
        pointerEvents={
          visible && !(Overlay && !centered && dialog) ? 'auto' : 'none'
        }
        accessibilityElementsHidden={
          !visible || Boolean(Overlay && !centered && dialog)
        }
        importantForAccessibility={
          !visible || (Overlay && !centered && dialog)
            ? 'no-hide-descendants'
            : 'auto'
        }
        style={[
          {
            maxHeight: centered ? '100%' : '92%',
            width: '100%',
            maxWidth: centered ? 480 : undefined,
            borderRadius: centered ? theme.radii.lg : undefined,
            borderTopLeftRadius: theme.radii.lg,
            borderTopRightRadius: theme.radii.lg,
            paddingBottom: centered ? undefined : insets.bottom,
            backgroundColor: theme.colors.surfaceRaised,
            opacity: progress,
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [centered ? 16 : 48, 0],
                }),
              },
            ],
          },
          sheetStyle,
        ]}
      >
        <ModalVisibilityContext.Provider value={Boolean(visible)}>
          {visible ? children : lastContent.current}
        </ModalVisibilityContext.Provider>
      </Animated.View>
      {!centered && Overlay ? <Overlay layer={layer} /> : null}
    </KeyboardAvoidingView>
  );
  if (embedded) return body;
  return (
    <Modal
      {...props}
      visible={presented}
      transparent
      animationType="none"
      onShow={event => {
        show();
        const target = initialFocusRef?.current
          ? findNodeHandle(initialFocusRef.current)
          : null;
        if (visible && target) AccessibilityInfo.setAccessibilityFocus(target);
        onShow?.(event);
      }}
      onRequestClose={() => {
        if (!centered && Overlay && dialog) {
          if (dialog.options.cancelable) dialogStore.resolve(dialog.id);
          return;
        }
        if (visible && dismissible) onDismissRequest();
      }}
      statusBarTranslucent
    >
      {body}
    </Modal>
  );
};
