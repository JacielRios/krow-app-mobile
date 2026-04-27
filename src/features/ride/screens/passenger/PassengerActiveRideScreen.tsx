import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanResponder, Animated, ScrollView } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../../core/theme/colors';
import { MapPlaceholder } from '../../components';
import { Button } from '../../../../core/components/ui/Button';

export const PassengerActiveRideScreen = ({ navigation }: any) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy < -50) {
          setIsExpanded(true);
        } else if (gestureState.dy > 50) {
          setIsExpanded(false);
        }
      },
    })
  ).current;

  return (
    <MapPlaceholder>
      {/* Back Button Floating */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>

      {/* Chat Button Floating */}
      <TouchableOpacity
        style={styles.chatButtonFloating}
        onPress={() => { /* TODO: Navigate to chat screen */ }}
      >
        <MaterialIcons name="chat" size={24} color={colors.text.inverse} />
      </TouchableOpacity>

      {/* Driver & Ride Info Bottom Sheet */}
      <Animated.View style={[styles.bottomSheet, isExpanded && styles.bottomSheetExpanded]}>
        {/* Drag Indicator (Visual only) */}
        <View style={styles.dragHandler} {...panResponder.panHandlers}>
          <View style={styles.dragIndicator} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          {/* Ride Status Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.statusText}>Viaje en curso</Text>
              <Text style={styles.fareText}>Tarifa: $50.00 MXN</Text>
            </View>
            <Text style={styles.etaText}>Llegada aprox. 14:30</Text>
          </View>

        {/* Driver Info */}
        <View style={styles.driverSection}>
          <View style={styles.avatarPlaceholder}>
            <MaterialIcons name="person" size={32} color={colors.text.muted} />
          </View>
          <View style={styles.driverDetails}>
            <Text style={styles.driverName}>Michelin (Conductor)</Text>
            <Text style={styles.carDetails}>Toyota Yaris - ABC-123</Text>
          </View>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>4.9</Text>
            <MaterialIcons name="star" size={16} color={colors.status.warning} />
          </View>
        </View>

        {/* Locations */}
        <View style={styles.locationSection}>
          <View style={styles.locationRow}>
            <MaterialIcons name="my-location" size={20} color={colors.primary} style={styles.icon} />
            <View>
              <Text style={styles.locationLabel}>Punto de encuentro</Text>
              <Text style={styles.locationValue}>Facultad de Ingeniería</Text>
            </View>
          </View>

          <View style={styles.locationDivider} />

          <View style={styles.locationRow}>
            <MaterialIcons name="location-pin" size={24} color={colors.status.error} style={styles.icon} />
            <View>
              <Text style={styles.locationLabel}>Tu parada</Text>
              <Text style={styles.locationValue}>Av. Universidad 123</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <View style={styles.actionBtnWrapper}>
            <Button title="Compartir Viaje" onPress={() => { }} />
          </View>
          {/* Cancel button usually has a different visual weight */}
          <TouchableOpacity style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancelar Viaje</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </Animated.View>
    </MapPlaceholder>
  );
};

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chatButtonFloating: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  bottomSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 8,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    maxHeight: '40%',
  },
  bottomSheetExpanded: {
    maxHeight: '80%',
  },
  dragHandler: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: colors.border.default,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  fareText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 4,
  },
  etaText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverDetails: {
    flex: 1,
    marginLeft: 12,
  },
  driverName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: colors.text.primary,
  },
  carDetails: {
    color: colors.text.secondary,
    fontSize: 14,
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontWeight: 'bold',
    marginRight: 4,
    color: colors.text.primary,
  },
  locationSection: {
    marginBottom: 24,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 30,
  },
  locationLabel: {
    fontSize: 12,
    color: colors.text.muted,
  },
  locationValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  locationDivider: {
    height: 30,
    width: 2,
    backgroundColor: colors.border.default,
    marginLeft: 14,
    marginVertical: -8,
  },
  actionsContainer: {
    gap: 12,
  },
  actionBtnWrapper: {
    marginBottom: 8,
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
