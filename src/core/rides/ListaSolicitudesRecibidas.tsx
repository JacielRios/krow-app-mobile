import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ListRenderItem,
} from 'react-native';
import TarjetaSolicitudPasajero, { RideRequest } from './TarjetaSolicitudPasajero';

interface Section {
  title: string;
  data: RideRequest[];
}

interface Props {
  sections: Section[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

export default function ListaSolicitudesRecibidas({
  sections,
  onAccept,
  onReject,
}: Props) {
  const renderItem: ListRenderItem<RideRequest> = ({ item }) => (
    <TarjetaSolicitudPasajero
      request={item}
      onAccept={onAccept}
      onReject={onReject}
    />
  );

  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <FlatList
      data={sections.flatMap((s) =>
        s.data.map((item) => ({ ...item, sectionTitle: s.title }))
      )}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <>
          {/* Render header solo para el primer item de cada sección */}
          {sections.find((s) => s.title === item.sectionTitle)?.data[0]?.id === item.id &&
            renderSectionHeader(item.sectionTitle)}
          <TarjetaSolicitudPasajero
            request={item}
            onAccept={onAccept}
            onReject={onReject}
          />
        </>
      )}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
});