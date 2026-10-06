import React from 'react';
import { StyleSheet, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { depth, glass } from '../../../shared/theme/materials';

/** Decorative route sketch, deliberately distinct from a geographical map. */
export const JourneyIllustration = () => {
  const { theme } = useTheme();
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.scene, { backgroundColor: theme.colors.primarySoft }]}
    >
      <View style={[styles.orbit, { borderColor: theme.colors.border }]} />
      <View style={[styles.road, { borderColor: theme.colors.primary }]} />
      <View style={[styles.start, glass(theme), depth(theme, 2)]}>
        <MaterialIcons
          name="trip-origin"
          size={22}
          color={theme.colors.primary}
        />
      </View>
      <View style={[styles.car, glass(theme), depth(theme, 3)]}>
        <MaterialIcons
          name="directions-car"
          size={42}
          color={theme.colors.primary}
        />
      </View>
      <View style={[styles.end, glass(theme), depth(theme, 2)]}>
        <MaterialIcons name="school" size={24} color={theme.colors.primary} />
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  scene: {
    height: 154,
    borderRadius: 24,
    marginBottom: 24,
    overflow: 'hidden',
  },
  orbit: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderWidth: 1,
    borderRadius: 125,
    left: 55,
    top: -90,
  },
  road: {
    position: 'absolute',
    width: '63%',
    height: 65,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderBottomRightRadius: 44,
    left: '17%',
    top: 30,
    transform: [{ rotate: '-12deg' }],
  },
  start: {
    position: 'absolute',
    left: '9%',
    top: 82,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  car: {
    position: 'absolute',
    left: '40%',
    top: 38,
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-8deg' }],
  },
  end: {
    position: 'absolute',
    right: '10%',
    top: 16,
    width: 48,
    height: 48,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
