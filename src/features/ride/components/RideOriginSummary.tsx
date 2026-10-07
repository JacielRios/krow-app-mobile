import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { spacing, typography } from '../../../shared/theme/tokens';
import { CAMPUS_ADDRESS, CAMPUS_ORIGIN } from '../domain/driverRideRules';
import type { PlacesAutocompleteValue } from '../../maps';

/** Un origen visible y sin controles de edición; respeta los viajes históricos. */
export function RideOriginSummary({
  origin = CAMPUS_ORIGIN,
}: {
  origin?: PlacesAutocompleteValue;
}) {
  const { theme } = useTheme();
  const isCampus =
    origin.location.lat === CAMPUS_ORIGIN.location.lat &&
    origin.location.lng === CAMPUS_ORIGIN.location.lng;
  return (
    <View style={styles.container}>
      <MaterialIcons
        name={isCampus ? 'school' : 'trip-origin'}
        size={24}
        color={theme.colors.primary}
      />
      <View style={styles.copy}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          Salida del viaje
        </Text>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {origin.address}
        </Text>
        {isCampus && (
          <Text style={[styles.address, { color: theme.colors.textSecondary }]}>
            {CAMPUS_ADDRESS}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  copy: { flex: 1, gap: spacing.xs },
  label: { fontSize: typography.size.sm },
  title: { fontSize: typography.size.md, fontWeight: '600' },
  address: { fontSize: typography.size.sm, lineHeight: 20 },
});
