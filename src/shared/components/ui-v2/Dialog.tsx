import React, { useRef } from 'react';
import { ScrollView, Text as NativeText, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { AnimatedModal } from './AnimatedModal';
import { Button } from './Button';
import { Text } from './Text';
import { useTheme } from '../../theme/ThemeProvider';

export type DialogType =
  | 'confirmation'
  | 'warning'
  | 'error'
  | 'success'
  | 'info';
export interface DialogAction {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}
export interface DialogProps {
  visible: boolean;
  title: string;
  message: string;
  type?: DialogType;
  icon?: string;
  actions: DialogAction[];
  onDismiss: () => void;
  dismissible?: boolean;
  embedded?: boolean;
}
const icons: Record<DialogType, string> = {
  confirmation: 'help-outline',
  warning: 'warning-amber',
  error: 'error-outline',
  success: 'check-circle-outline',
  info: 'info-outline',
};

/** One visual language for app confirmations, feedback and blocking notices. */
export function Dialog({
  visible,
  title,
  message,
  type = 'info',
  icon,
  actions,
  onDismiss,
  dismissible = true,
  embedded = false,
}: DialogProps) {
  const { theme } = useTheme();
  const heading = useRef<NativeText>(null);
  const color =
    type === 'confirmation' ? theme.colors.primary : theme.colors.status[type];
  const ordered = [
    ...actions.filter(a => a.style !== 'cancel'),
    ...actions.filter(a => a.style === 'cancel'),
  ];
  return (
    <AnimatedModal
      visible={visible}
      embedded={embedded}
      presentation="dialog"
      dismissible={dismissible}
      onDismissRequest={onDismiss}
      initialFocusRef={heading}
      sheetStyle={{ padding: 24 }}
    >
      <View style={{ flexShrink: 1, gap: 20 }}>
        <ScrollView
          bounces={false}
          style={{ flexGrow: 0, flexShrink: 1 }}
          contentContainerStyle={{ gap: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.surface,
            }}
          >
            <MaterialIcons name={icon ?? icons[type]} color={color} size={28} />
          </View>
          <View style={{ gap: 12 }}>
            <NativeText
              ref={heading}
              accessibilityRole="header"
              style={{
                color: theme.colors.textPrimary,
                fontSize: 24,
                fontWeight: theme.typography.weight.semibold,
                lineHeight: 30,
              }}
            >
              {title}
            </NativeText>
            <Text tone="secondary">{message}</Text>
          </View>
        </ScrollView>
        <View style={{ gap: 8 }}>
          {ordered.map((action, index) => (
            <Button
              key={`${index}:${action.text}`}
              title={action.text}
              variant={
                action.style === 'cancel'
                  ? 'text'
                  : action.style === 'destructive'
                  ? 'destructive'
                  : index === 0
                  ? 'primary'
                  : 'tonal'
              }
              onPress={action.onPress}
            />
          ))}
        </View>
      </View>
    </AnimatedModal>
  );
}
