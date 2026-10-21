import React, { useEffect, useState } from 'react';
import { AppState, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';

export interface SkeletonProps {
  width?: ViewStyle['width'];
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  active?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height,
  radius,
  style,
  active = true,
}) => {
  const { theme, motionEnabled } = useTheme();
  const opacity = useSharedValue(motionEnabled ? 0.55 : 0.75);
  const [foreground, setForeground] = useState(
    AppState.currentState === 'active',
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state =>
      setForeground(state === 'active'),
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (motionEnabled && active && foreground) {
      opacity.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
    } else {
      cancelAnimation(opacity);
      opacity.value = 0.75;
    }
    return () => cancelAnimation(opacity);
  }, [motionEnabled, opacity, active, foreground]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      accessible={false}
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radii.md,
          backgroundColor: theme.colors.skeleton,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};
