import React, { useRef } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../shared/theme/ThemeProvider';

export const SeatDial = ({
  value,
  max,
  onChange,
}: {
  value: number | null;
  max: number;
  onChange: (value: number) => void;
}) => {
  const { theme } = useTheme();
  const dial = useRef<View>(null);
  const center = useRef({ x: 0, y: 0 });
  const lastGestureValue = useRef<number | null>(null);
  const adjust = (x: number, y: number) => {
    if (max < 1) return;
    const dx = x - center.current.x,
      dy = y - center.current.y;
    if (Math.hypot(dx, dy) < 16) return;
    const angle = Math.max(
      -135,
      Math.min(135, (Math.atan2(dx, -dy) * 180) / Math.PI),
    );
    const next = 1 + Math.round(((angle + 135) / 270) * (max - 1));
    if (next !== lastGestureValue.current) {
      lastGestureValue.current = next;
      onChange(next);
    }
  };
  const latest = useRef({ max, adjust });
  latest.current = { max, adjust };
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: event =>
        latest.current.max > 0 &&
        Math.hypot(
          event.nativeEvent.locationX - 50,
          event.nativeEvent.locationY - 50,
        ) > 20,
      onPanResponderGrant: event => {
        lastGestureValue.current = null;
        const { pageX, pageY } = event.nativeEvent;
        dial.current?.measureInWindow((x, y, width, height) => {
          center.current = { x: x + width / 2, y: y + height / 2 };
          latest.current.adjust(pageX, pageY);
        });
      },
      onPanResponderMove: event =>
        latest.current.adjust(event.nativeEvent.pageX, event.nativeEvent.pageY),
      onPanResponderTerminationRequest: () => true,
    }),
  ).current;
  const angle =
    (((value == null || max <= 1 ? 0 : (value - 1) / (max - 1)) * 270 - 135) *
      Math.PI) /
    180;
  return (
    <View
      ref={dial}
      collapsable={false}
      {...responder.panHandlers}
      style={[
        styles.dial,
        { backgroundColor: theme.colors.surface },
        max < 1 && { opacity: 0.45 },
      ]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Asientos disponibles"
      accessibilityHint="Gira para elegir o usa las opciones de asientos."
      accessibilityState={{ disabled: max < 1 }}
      accessibilityValue={{
        min: max > 0 ? 1 : 0,
        max,
        now: value ?? (max > 0 ? 1 : 0),
        text: value == null ? 'Sin elegir' : `${value} asientos`,
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={event => {
        if (
          max > 0 &&
          ['increment', 'decrement'].includes(event.nativeEvent.actionName)
        )
          onChange(
            Math.max(
              1,
              Math.min(
                max,
                (value ?? 1) +
                  (event.nativeEvent.actionName === 'increment' ? 1 : -1),
              ),
            ),
          );
      }}
    >
      <View
        pointerEvents="none"
        style={[styles.ring, { borderColor: theme.colors.border }]}
      />
      {value != null && (
        <View
          pointerEvents="none"
          style={[
            styles.pointer,
            {
              backgroundColor: theme.colors.primary,
              left: 44 + Math.sin(angle) * 39,
              top: 44 - Math.cos(angle) * 39,
            },
          ]}
        />
      )}
      <Text
        pointerEvents="none"
        style={[styles.value, { color: theme.colors.primary }]}
      >
        {value ?? '—'}
      </Text>
      <Text
        pointerEvents="none"
        style={{ color: theme.colors.textSecondary, fontSize: 12 }}
      >
        ASIENTOS
      </Text>
    </View>
  );
};
const styles = StyleSheet.create({
  dial: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    left: 10,
    top: 10,
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 2,
  },
  pointer: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  value: { fontSize: 30, fontWeight: '700' },
});
