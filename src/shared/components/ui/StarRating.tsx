import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { IconButton } from '../ui-v2/IconButton';

export interface StarRatingProps {
  value?: number;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  maxStars?: number;
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
  style?: ViewStyle;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value = 0,
  onChange,
  readOnly = false,
  maxStars = 5,
  size = 28,
  activeColor,
  inactiveColor,
  style,
}) => {
  const { theme } = useTheme();
  return (
    <View
      style={[styles.container, style]}
      accessible={readOnly}
      accessibilityRole={readOnly ? 'text' : undefined}
      accessibilityLabel={
        readOnly ? `${value} de ${maxStars} estrellas` : undefined
      }
    >
      {Array.from({ length: maxStars }, (_, i) => {
        const starNumber = i + 1;
        const filled = starNumber <= value;

        const color = filled
          ? activeColor ?? theme.colors.status.warning
          : inactiveColor ?? theme.colors.textMuted;
        return readOnly ? (
          <MaterialIcons
            key={starNumber}
            name={filled ? 'star' : 'star-border'}
            size={size}
            color={color}
            accessible={false}
            style={{ marginHorizontal: spacing.xs / 2 }}
          />
        ) : (
          <IconButton
            key={starNumber}
            iconName={filled ? 'star' : 'star-border'}
            iconSize={size}
            color={color}
            variant="plain"
            onPress={() => onChange?.(starNumber)}
            accessibilityRole="radio"
            accessibilityLabel={`${starNumber} de ${maxStars} estrellas`}
            accessibilityState={{ checked: starNumber === value }}
            style={{
              marginHorizontal: spacing.xs / 2,
            }}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
