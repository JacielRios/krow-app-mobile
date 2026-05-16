import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../shared/theme/colors';
import { spacing } from '../../../shared/theme/tokens';

interface StarRatingProps {
  maxStars?: number;
  rating?: number;
  onRatingChange?: (rating: number) => void;
  size?: number;
  disabled?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  maxStars = 5,
  rating: initialRating = 0,
  onRatingChange,
  size = 32,
  disabled = false,
}) => {
  const [rating, setRating] = useState(initialRating);

  const handlePress = (newRating: number) => {
    if (!disabled) {
      setRating(newRating);
      onRatingChange && onRatingChange(newRating);
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: maxStars }).map((_, index) => {
        const starNumber = index + 1;
        const filled = starNumber <= rating;
        return (
          <TouchableOpacity
            key={`star-${index}`}
            activeOpacity={0.6}
            disabled={disabled}
            onPress={() => handlePress(starNumber)}
            style={styles.starBtn}
          >
            <MaterialIcons
              name={filled ? 'star' : 'star-border'}
              size={size}
              color={filled ? '#F59E0B' : colors.border.default}
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
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  starBtn: {
    paddingHorizontal: 3,
  },
});
