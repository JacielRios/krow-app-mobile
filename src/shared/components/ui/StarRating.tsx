import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

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
    <View style={[styles.container, style]}>
      {Array.from({ length: maxStars }, (_, i) => {
        const starNumber = i + 1;
        const filled = starNumber <= value;

        return (
          <TouchableOpacity
            key={starNumber}
            disabled={readOnly}
            activeOpacity={0.7}
            onPress={() => onChange?.(starNumber)}
            accessibilityRole="button"
            accessibilityLabel={`${starNumber} de ${maxStars} estrellas`}
            accessibilityState={{ selected: filled, disabled: readOnly }}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            style={{
              marginHorizontal: spacing.xs / 2,
              minWidth: 48,
              minHeight: 48,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialIcons
              name={filled ? 'star' : 'star-border'}
              size={size}
              color={
                filled
                  ? activeColor ?? theme.colors.status.warning
                  : inactiveColor ?? theme.colors.textMuted
              }
            />
          </TouchableOpacity>
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
