import React, { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';

/** Animate the overlay independently. The map keeps its dimensions and native view. */
export function ExpandablePanel({
  height,
  style,
  children,
}: React.PropsWithChildren<{
  height: number;
  style?: StyleProp<ViewStyle>;
}>) {
  const { motionEnabled } = useTheme();
  const panelHeight = useSharedValue(height);
  useEffect(() => {
    panelHeight.value = motionEnabled
      ? withTiming(height, { duration: 220 })
      : height;
    return () => cancelAnimation(panelHeight);
  }, [height, motionEnabled, panelHeight]);
  const animation = useAnimatedStyle(() => ({ height: panelHeight.value }));
  return <Animated.View style={[style, animation]}>{children}</Animated.View>;
}
