import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  title: string;
  pendingCount: number;
}

export default function HeaderSolicitudes({ title, pendingCount }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {pendingCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pendingCount}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    position: 'relative',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  badge: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});