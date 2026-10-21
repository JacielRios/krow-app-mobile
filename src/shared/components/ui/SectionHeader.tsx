import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useThemedStyles, type LegacyColors } from '../../theme/legacyTheme';
import { spacing, typography } from '../../theme/tokens';
import { Button } from '../ui-v2/Button';

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
  const { styles } = useThemedStyles(createStyles);

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, titleStyle]}>{title}</Text>
      {onPressAction && (
        <Button
          title={actionLabel}
          variant="text"
          size="sm"
          fullWidth={false}
          style={{ flexShrink: 1 }}
          onPress={onPressAction}
        />
      )}
    </View>
  );
};

const createStyles = (colors: LegacyColors) =>
  StyleSheet.create({
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
