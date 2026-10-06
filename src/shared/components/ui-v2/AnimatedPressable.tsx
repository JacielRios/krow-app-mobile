import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
import { ElevationLevel } from '../../theme/elevation';
import { depth } from '../../theme/materials';
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
  const pressed = useRef(new Animated.Value(0)).current;
  const { theme, motionEnabled } = useTheme();
  const resolvedRadius = radius ?? theme.radii.lg;

  useEffect(() => {
    pressed.stopAnimation();
    pressed.setValue(0);
    return () => pressed.stopAnimation();
  }, [pressed, motionEnabled, feedback]);
  const animatePress = (value: number) => {
    pressed.stopAnimation();
    if (!motionEnabled || feedback === 'none') {
      pressed.setValue(0);
      return;
    }
    Animated.spring(pressed, {
      toValue: value,
      ...theme.motion.spring.press,
      useNativeDriver: true,
      isInteraction: false,
    }).start();
  };
  const animatedStyle = {
    opacity:
      feedback === 'opacity'
        ? pressed.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.82],
            extrapolate: 'clamp',
          })
        : 1,
    transform: [
      {
        scale:
          feedback === 'scale'
            ? pressed.interpolate({
                inputRange: [0, 1],
                outputRange: [1, pressedScale],
                extrapolate: 'clamp',
              })
            : 1,
      },
    ],
  };

  return (
    <AnimatedPressableBase
      {...props}
      collapsable={false}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={{
        ...props.accessibilityState,
        disabled: Boolean(disabled),
      }}
      onPressIn={event => {
        animatePress(1);
        onPressIn?.(event);
      }}
      onPressOut={event => {
        animatePress(0);
        onPressOut?.(event);
      }}
      style={[
        { borderRadius: resolvedRadius },
        depth(theme, elevation),
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
