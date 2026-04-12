import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../../core/theme/colors';
import { MapPlaceholder } from '../../components/MapPlaceholder';
import { Button } from '../../../../core/components/ui/Button';

// Dummy data for passengers
const passengers = [
  { id: '1', name: 'Ana S.', stop: 'Av. Universidad 123', status: 'En viaje' },
  { id: '2', name: 'Luis M.', stop: 'Facultad de Derecho', status: 'En viaje' },
];

export const DriverActiveRideScreen = ({ navigation }: any) => {
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  return (
    <MapPlaceholder>
      {/* Route & Cancel Buttons Floating on Map */}
      <View style={styles.floatingTopActions}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.viewRouteBtn}
          onPress={() => setIsMapExpanded(!isMapExpanded)}
        >
          <MaterialIcons 
            name={isMapExpanded ? "format-list-bulleted" : "map"} 
            size={20} 
            color={colors.primary} 
          />
          <Text style={styles.viewRouteText}>
            {isMapExpanded ? "Ver detalles" : "Ver ruta"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Ride Info Bottom Sheet */}
      {!isMapExpanded && (
        <View style={styles.bottomSheet}>
        <View style={styles.dragIndicator} />

        {/* Destination Header */}
        <View style={styles.header}>
          <Text style={styles.destinationLabel}>Destino Final</Text>
          <Text style={styles.destinationValue}>Campus Central</Text>
          <Text style={styles.etaText}>Estimado: 14:45</Text>
        </View>

        <View style={styles.divider} />

        {/* Passengers List */}
        <View style={styles.passengersSection}>
          <Text style={styles.sectionTitle}>Pasajeros y paradas ({passengers.length})</Text>
          <ScrollView style={styles.passengersList}>
            {passengers.map((p, index) => (
              <View key={p.id} style={styles.passengerItem}>
                <View style={styles.passengerHeader}>
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>{p.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.passengerInfo}>
                    <Text style={styles.passengerName}>{p.name}</Text>
                    <Text style={styles.passengerStatus}>{p.status}</Text>
                  </View>
                  <TouchableOpacity style={styles.stopActionBtn}>
                    <Text style={styles.stopActionText}>Dejar aquí</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.stopRow}>
                  <MaterialIcons name="location-pin" size={16} color={colors.status.info} />
                  <Text style={styles.stopAddress}>{p.stop}</Text>
                </View>

                {index < passengers.length - 1 && <View style={styles.itemDivider} />}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Button
            title="Finalizar Viaje completo"
            onPress={() => navigation.navigate('DriverFinishedRide')}
          />
          <TouchableOpacity style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancelar Viaje</Text>
          </TouchableOpacity>
        </View>

        </View>
      )}
    </MapPlaceholder>
  );
};

const styles = StyleSheet.create({
  floatingTopActions: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  viewRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  viewRouteText: {
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: 6,
  },
  bottomSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    maxHeight: '70%',
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: colors.border.default,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
  },
  destinationLabel: {
    fontSize: 12,
    color: colors.text.muted,
    textTransform: 'uppercase',
  },
  destinationValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginVertical: 4,
  },
  etaText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: 16,
  },
  passengersSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
  },
  passengersList: {
    marginBottom: 16,
  },
  passengerItem: {
    paddingVertical: 12,
  },
  passengerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: colors.text.inverse,
    fontWeight: 'bold',
    fontSize: 16,
  },
  passengerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  passengerStatus: {
    fontSize: 12,
    color: colors.status.success,
  },
  stopActionBtn: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  stopActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 52, // Align with text
  },
  stopAddress: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 6,
  },
  itemDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginTop: 12,
    marginLeft: 52,
  },
  actionsContainer: {
    marginTop: 10,
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.status.error,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
