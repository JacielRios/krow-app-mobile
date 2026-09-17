import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export type BadgeStatus = 'completed' | 'pending' | 'cancelled' | 'verified' | 'active' | 'inactive' | 'in_progress' | 'full' | 'rejected';
export type BadgeTone = 'success' | 'warning' | 'error' | 'info' | 'primary' | 'neutral' | 'accent' | 'errorMuted';
export type BadgeSize = 'sm' | 'md';
export interface StatusBadgeProps { status?: BadgeStatus; tone?: BadgeTone; label?: string; size?: BadgeSize; icon?: React.ReactNode; style?: StyleProp<ViewStyle> }

const statusMap: Record<BadgeStatus, { tone: BadgeTone; label: string }> = {
  completed: { tone: 'success', label: 'Completado' }, pending: { tone: 'warning', label: 'Pendiente' }, cancelled: { tone: 'error', label: 'Cancelado' }, verified: { tone: 'primary', label: 'Verificado' }, active: { tone: 'success', label: 'Activo' }, inactive: { tone: 'neutral', label: 'Inactivo' }, in_progress: { tone: 'info', label: 'En progreso' }, full: { tone: 'accent', label: 'Lleno' }, rejected: { tone: 'errorMuted', label: 'Rechazado' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, tone, label, size = 'md', icon, style }) => {
  const { theme } = useTheme();
  const resolvedTone = tone ?? (status ? statusMap[status].tone : 'neutral');
  const resolvedLabel = label ?? (status ? statusMap[status].label : '');
  const base = resolvedTone === 'primary' ? theme.colors.primary : resolvedTone === 'neutral' ? theme.colors.textMuted : resolvedTone === 'accent' ? theme.colors.status.warning : resolvedTone === 'errorMuted' ? theme.colors.status.error : theme.colors.status[resolvedTone];
  const isSmall = size === 'sm';
  return (
    <View accessibilityRole="text" style={[{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: `${base}24`, paddingHorizontal: isSmall ? theme.spacing.sm : theme.spacing.md - 2, paddingVertical: isSmall ? 2 : theme.spacing.xs, borderRadius: theme.radii.full }, style]}>
      {icon ?? <View style={{ width: isSmall ? 5 : 6, height: isSmall ? 5 : 6, borderRadius: theme.radii.full, marginRight: theme.spacing.xs, backgroundColor: base }} />}
      <Text style={{ color: base, fontSize: isSmall ? theme.typography.size.xs : theme.typography.size.sm, fontWeight: theme.typography.weight.semibold }}>{resolvedLabel}</Text>
    </View>
  );
};
