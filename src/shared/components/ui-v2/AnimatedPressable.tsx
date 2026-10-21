import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
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
  stateLayerColor?: string;
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
  stateLayerColor,
  onPressIn,
  onPressOut,
  onFocus,
  onBlur,
  accessibilityRole = 'button',
  ...props
}) => {
  const pressed = useRef(new Animated.Value(0)).current;
  const [focused, setFocused] = useState(false);
  const { theme, motionEnabled } = useTheme();
  const resolvedRadius = radius ?? theme.radii.sm;

  useEffect(() => {
    pressed.stopAnimation();
    pressed.setValue(0);
    return () => pressed.stopAnimation();
  }, [pressed, motionEnabled, feedback, disabled]);
  const animatePress = (value: number) => {
    pressed.stopAnimation();
    if (!motionEnabled || feedback === 'none') {
      pressed.setValue(feedback === 'none' ? 0 : value);
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
      feedback === 'opacity' || (!motionEnabled && feedback === 'scale')
        ? pressed.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.82],
            extrapolate: 'clamp',
          })
        : 1,
    transform: [
      {
        scale:
          feedback === 'scale' && motionEnabled
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
      onFocus={event => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={event => {
        setFocused(false);
        onBlur?.(event);
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
        <Animated.View
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: stateLayerColor ?? theme.colors.textPrimary,
              opacity: disabled
                ? 0
                : pressed.interpolate({
                    inputRange: [0, 1],
                    outputRange: [focused ? 0.1 : 0, 0.12],
                  }),
            },
          ]}
        />
      </View>
    </AnimatedPressableBase>
  );
};
