import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import TarjetaHistorialRide from '../components/TarjetaHistorialRide';
import TarjetaRidePendiente from '../components/TarjetaRidePendiente';
import { HistoryRide, Section } from '../types';

interface Props {
  sections: Section[];
  onViewDetails: (id: string) => void;
  onStartRide: (id: string) => void;
  onCancelRide: (id: string) => void;
  onMessageCompanion?: (id: string) => void;
}

export default function HistorialRidesScreen({
  sections,
  onViewDetails,
  onStartRide,
  onCancelRide,
  onMessageCompanion,
}: Props) {
  const isPastSection = (title: string) => title !== 'Hoy';

  const flatData = sections.flatMap((s) =>
    s.data.map((item) => ({ ...item, sectionTitle: s.title }))
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Historial de Actividad</Text>
      </View>

      <FlatList
        data={flatData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const section = sections.find((s) => s.title === item.sectionTitle)!;
          const isPast = isPastSection(item.sectionTitle);
          const isFirstInSection = section.data[0]?.id === item.id;

          return (
            <>
              {isFirstInSection && (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{item.sectionTitle}</Text>
                </View>
              )}

              {!isPast && item.status === 'scheduled' && item.companions ? (
                <TarjetaRidePendiente
                  ride={item}
                  onStartRide={onStartRide}
                  onCancelRide={onCancelRide}
                  onMessageCompanion={onMessageCompanion || (() => {})}
                />
              ) : (
                <TarjetaHistorialRide
                  ride={item}
                  isPast={isPast}
                  onStartRide={onStartRide}
                  onCancelRide={onCancelRide}
                  onViewDetails={onViewDetails}
                />
              )}
            </>
          );
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  listContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
});