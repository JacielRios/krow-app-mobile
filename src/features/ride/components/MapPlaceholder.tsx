import React from 'react';
import { View, StyleSheet, Text, ImageBackground } from 'react-native';
import { colors } from '../../../shared/theme/colors';
import { radii, spacing, typography } from '../../../shared/theme/tokens';

interface MapPlaceholderProps {
  children?: React.ReactNode;
}

export const MapPlaceholder: React.FC<MapPlaceholderProps> = ({ children }) => {
  return (
    <ImageBackground
      source={{ uri: 'https://miro.medium.com/v2/resize:fit:1200/1*qYUvhGdpNdIvaBpNM0cG1Q.jpeg' }}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlayTextContainer}>
        <Text style={styles.mapText}>Mapa Interactivo</Text>
      </View>
      {/* Content over the map (like bottom sheets or floating buttons) */}
      <View style={styles.contentOverlay}>
        {children}
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.map.background,
  },
  overlayTextContainer: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: radii.xl,
  },
  mapText: {
    color: colors.text.secondary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    textAlign: 'center',
  },
  contentOverlay: {
    flex: 1,
    justifyContent: 'flex-end', // Aligns children (bottom sheet) to the bottom
  },
});
