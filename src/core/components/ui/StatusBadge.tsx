import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, radii, typography } from '../../theme/tokens';

export type BadgeStatus =
  | 'completed'
  | 'pending'
  | 'cancelled'
  | 'verified'
  | 'active'
  | 'inactive'
  | 'in_progress';

export type BadgeTone = 'success' | 'warning' | 'error' | 'info' | 'primary' | 'neutral';

export type BadgeSize = 'sm' | 'md';

export interface StatusBadgeProps {
  status?: BadgeStatus;
  tone?: BadgeTone;
  label?: string;
  size?: BadgeSize;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

const STATUS_MAP: Record<BadgeStatus, { tone: BadgeTone; label: string }> = {
  completed:   { tone: 'success',  label: 'Completado'  },
  pending:     { tone: 'warning',  label: 'Pendiente'   },
  cancelled:   { tone: 'error',    label: 'Cancelado'   },
  verified:    { tone: 'primary',  label: 'Verificado'  },
  active:      { tone: 'success',  label: 'Activo'      },
  inactive:    { tone: 'neutral',  label: 'Inactivo'    },
  in_progress: { tone: 'info',     label: 'En progreso' },
};

const TONE_COLORS: Record<BadgeTone, { background: string; text: string; dot: string }> = {
  success: { background: '#E8F5E9', text: '#2E7D32',      dot: colors.status.success },
  warning: { background: '#FFF8E1', text: '#E65100',      dot: colors.status.warning },
  error:   { background: '#FFEBEE', text: '#C62828',      dot: colors.status.error   },
  info:    { background: '#E3F2FD', text: '#1565C0',      dot: colors.status.info    },
  primary: { background: '#E8EEF9', text: colors.primary, dot: colors.primary        },
  neutral: { background: '#F5F5F5', text: '#616161',      dot: '#9E9E9E'             },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  tone,
  label,
  size = 'md',
  icon,
  style,
}) => {
  const resolvedTone = tone ?? (status ? STATUS_MAP[status].tone : 'neutral');
  const resolvedLabel = label ?? (status ? STATUS_MAP[status].label : '');
  const toneColors = TONE_COLORS[resolvedTone];
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: toneColors.background,
          paddingHorizontal: isSmall ? spacing.sm : spacing.md - 2,
          paddingVertical: isSmall ? 2 : spacing.xs,
          borderRadius: radii.full,
        },
        style,
      ]}
    >
      {icon ? (
        <View style={styles.iconWrap}>{icon}</View>
      ) : (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: toneColors.dot,
              width: isSmall ? 5 : 6,
              height: isSmall ? 5 : 6,
            },
          ]}
        />
      )}
      <Text
        style={[
          styles.label,
          {
            color: toneColors.text,
            fontSize: isSmall ? typography.size.xs : typography.size.sm,
          },
        ]}
      >
        {resolvedLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  dot: {
    borderRadius: radii.full,
    marginRight: spacing.xs,
  },
  iconWrap: {
    marginRight: spacing.xs,
  },
  label: {
    fontWeight: typography.weight.medium,
  },
});
