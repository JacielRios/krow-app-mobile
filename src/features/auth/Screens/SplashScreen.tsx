import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image } from 'react-native';
import { useTheme } from '../../../shared/theme/ThemeProvider';

export default function SplashScreen({ navigation }: any) {
  const { theme, motionEnabled } = useTheme();
  const scaleValue = useRef(new Animated.Value(0.9)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: motionEnabled ? 220 : 0,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: motionEnabled ? 220 : 0,
        useNativeDriver: true,
      }),
    ]);
    animation.start();

    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2500);

    return () => {
      clearTimeout(timer);
      animation.stop();
    };
  }, [navigation, opacityValue, scaleValue, motionEnabled]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: opacityValue, transform: [{ scale: scaleValue }] },
        ]}
      >
        <Image
          source={require('../../../assets/Krow Logo Icon.png')}
          resizeMode="contain"
          style={styles.logoImage}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    width: 180,
    height: 180,
  },
});
