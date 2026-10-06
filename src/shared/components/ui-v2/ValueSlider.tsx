import React, { useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { depth } from '../../theme/materials';
import { Button } from './Button';

interface Props {
  label: string;
  value: number | null;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  disabled?: boolean;
}

export const ValueSlider = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  formatValue = String,
  disabled = false,
}: Props) => {
  const { theme } = useTheme();
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const track = useRef<View>(null);
  const left = useRef(0);
  const gestureActive = useRef(false);
  const current = Math.min(max, Math.max(min, value ?? min));
  const change = (next: number) => {
    if (!disabled)
      onChange(Number(Math.min(max, Math.max(min, next)).toFixed(2)));
  };
  const position = (pageX: number) => {
    if (!width || disabled) return;
    const ratio = Math.max(
      0,
      Math.min(1, (pageX - left.current - 22) / Math.max(1, width - 44)),
    );
    change(min + Math.round((ratio * (max - min)) / step) * step);
  };
  const latest = useRef({ disabled, position });
  latest.current = { disabled, position };
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !latest.current.disabled,
      onMoveShouldSetPanResponder: (_, gesture) =>
        !latest.current.disabled && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: () => {
        gestureActive.current = true;
        track.current?.measureInWindow(x => {
          left.current = x;
        });
      },
      onPanResponderMove: (event, gesture) => {
        if (
          Math.abs(gesture.dx) > 4 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy)
        ) {
          setDragging(true);
          latest.current.position(event.nativeEvent.pageX);
        }
      },
      onPanResponderRelease: (event, gesture) => {
        if (
          gestureActive.current &&
          Math.abs(gesture.dy) < 8 &&
          Math.abs(gesture.dx) < 8
        )
          latest.current.position(event.nativeEvent.pageX);
        gestureActive.current = false;
        setDragging(false);
      },
      onPanResponderTerminationRequest: (_, gesture) =>
        Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderTerminate: () => {
        gestureActive.current = false;
        setDragging(false);
      },
    }),
  ).current;
  const offset =
    ((current - min) / Math.max(1, max - min)) * Math.max(0, width - 44);
  return (
    <View style={[styles.wrap, disabled && styles.disabled]}>
      <View style={styles.heading}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          {label}
        </Text>
        <Text style={[styles.value, { color: theme.colors.textPrimary }]}>
          {value == null ? 'Sin elegir' : formatValue(value)}
        </Text>
      </View>
      <View
        ref={track}
        collapsable={false}
        {...responder.panHandlers}
        onLayout={event => setWidth(event.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityHint="Desliza horizontalmente o usa los botones para ajustar."
        accessibilityState={{ disabled }}
        accessibilityValue={{
          min,
          max,
          now: current,
          text: value == null ? 'Sin elegir' : formatValue(value),
        }}
        accessibilityActions={[
          { name: 'increment', label: 'Aumentar' },
          { name: 'decrement', label: 'Disminuir' },
        ]}
        onAccessibilityAction={event => {
          if (
            !disabled &&
            ['increment', 'decrement'].includes(event.nativeEvent.actionName)
          )
            change(
              current +
                (event.nativeEvent.actionName === 'increment' ? step : -step),
            );
        }}
        style={styles.trackTouch}
      >
        <View
          pointerEvents="none"
          style={[styles.track, { backgroundColor: theme.colors.border }]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.progress,
            { width: offset, backgroundColor: theme.colors.primary },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            depth(theme, 1),
            {
              left: offset,
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.primary,
              transform: [{ scale: dragging ? 1.1 : 1 }],
            },
          ]}
        >
          <View
            style={[styles.thumbDot, { backgroundColor: theme.colors.primary }]}
          />
        </View>
      </View>
      <View style={styles.actions}>
        <Button
          title="−"
          accessibilityLabel={`Disminuir ${label}`}
          fullWidth={false}
          size="sm"
          variant="outline"
          disabled={disabled || (value != null && current <= min)}
          onPress={() => change(current - step)}
        />
        <Text style={{ color: theme.colors.textSecondary }}>
          {formatValue(min)} — {formatValue(max)}
        </Text>
        <Button
          title="+"
          accessibilityLabel={`Aumentar ${label}`}
          fullWidth={false}
          size="sm"
          variant="outline"
          disabled={disabled || (value != null && current >= max)}
          onPress={() => change(value == null ? min : current + step)}
        />
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  disabled: { opacity: 0.45 },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: { fontSize: 14, flex: 1 },
  value: { fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'] },
  trackTouch: { height: 64, justifyContent: 'center' },
  track: { height: 8, borderRadius: 4, marginHorizontal: 22 },
  progress: { height: 8, borderRadius: 4, position: 'absolute', left: 22 },
  thumb: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbDot: { width: 10, height: 10, borderRadius: 5 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
