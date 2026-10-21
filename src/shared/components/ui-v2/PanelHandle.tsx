import React, { useRef } from 'react';
import { PanResponder, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AnimatedPressable } from './AnimatedPressable';
import { Text } from './Text';
import { useTheme } from '../../theme/ThemeProvider';

/** Only the handle owns vertical gestures; the map and body keep their gestures. */
export function PanelHandle({
  expanded,
  onChange,
}: {
  expanded: boolean;
  onChange: (expanded: boolean) => void;
}) {
  const { theme } = useTheme();
  const latest = useRef(onChange);
  latest.current = onChange;
  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dy) > 10 &&
        Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -24) latest.current(true);
        if (gesture.dy > 24) latest.current(false);
      },
      onPanResponderTerminationRequest: () => true,
    }),
  ).current;
  return (
    <View {...responder.panHandlers}>
      <AnimatedPressable
        feedback="opacity"
        onPress={() => onChange(!expanded)}
        accessibilityLabel={
          expanded
            ? 'Contraer detalles del viaje'
            : 'Expandir detalles del viaje'
        }
        accessibilityHint="También puedes deslizar hacia arriba o abajo desde este control."
        accessibilityState={{ expanded }}
        contentStyle={{
          minHeight: 48,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
        }}
      >
        <View
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: theme.colors.controlBorder,
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text variant="caption" tone="secondary">
            {expanded ? 'Ver más mapa' : 'Detalles del viaje'}
          </Text>
          <Icon
            name={expanded ? 'expand-more' : 'expand-less'}
            size={18}
            color={theme.colors.textSecondary}
          />
        </View>
      </AnimatedPressable>
    </View>
  );
}
