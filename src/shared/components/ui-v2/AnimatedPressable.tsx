import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { createShadow, ElevationLevel } from '../../theme/elevation';
import { useTheme } from '../../theme/ThemeProvider';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export interface AnimatedPressableProps
  extends Omit<PressableProps, 'style' | 'children'> {
  children: React.ReactNode;
  elevation?: ElevationLevel;
  pressedScale?: number;
  feedback?: 'scale' | 'opacity' | 'none';
  radius?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  disabled,
  elevation = 0,
  pressedScale = 0.98,
  feedback = 'scale',
  radius,
  style,
  contentStyle,
  onPressIn,
  onPressOut,
  accessibilityRole = 'button',
  ...props
}) => {
  const pressed = useSharedValue(0);
  const { theme, motionEnabled } = useTheme();
  const resolvedRadius = radius ?? theme.radii.lg;

  const animatedStyle = useAnimatedStyle(() => {
    const animate = motionEnabled && feedback !== 'none';
    return {
      opacity:
        animate && feedback === 'opacity'
          ? withTiming(pressed.value ? 0.82 : 1, {
              duration: theme.motion.duration.fast,
            })
          : 1,
      transform: [
        {
          scale:
            animate && feedback === 'scale'
              ? withSpring(
                  pressed.value ? pressedScale : 1,
                  theme.motion.spring.press,
                )
              : 1,
        },
      ],
    };
  });

  return (
    <AnimatedPressableBase
      {...props}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: Boolean(disabled) }}
      onPressIn={event => {
        pressed.value = 1;
        onPressIn?.(event);
      }}
      onPressOut={event => {
        pressed.value = 0;
        onPressOut?.(event);
      }}
      style={[
        { borderRadius: resolvedRadius },
        createShadow(elevation, theme.colors.shadow),
        animatedStyle,
        style,
      ]}
    >
      <View
        style={[
          {
            overflow: 'hidden',
            borderRadius: resolvedRadius,
            opacity: disabled ? 0.45 : 1,
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </AnimatedPressableBase>
  );
};
