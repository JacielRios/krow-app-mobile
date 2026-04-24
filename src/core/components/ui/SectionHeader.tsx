import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, typography } from '../../theme/tokens';

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onPressAction?: () => void;
  style?: ViewStyle;
  titleStyle?: TextStyle;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  actionLabel = 'Ver todos',
  onPressAction,
  style,
  titleStyle,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, titleStyle]} numberOfLines={1}>
        {title}
      </Text>
      {onPressAction && (
        <TouchableOpacity
          onPress={onPressAction}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginRight: spacing.sm,
  },
  action: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
    color: colors.primaryLight,
  },
});
