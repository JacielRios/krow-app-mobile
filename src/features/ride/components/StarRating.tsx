import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../core/theme/colors';

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
        return (
          <TouchableOpacity
            key={`star-${index}`}
            activeOpacity={0.7}
            disabled={disabled}
            onPress={() => handlePress(starNumber)}
          >
            <MaterialIcons
              name={starNumber <= rating ? 'star' : 'star-border'}
              size={size}
              color={starNumber <= rating ? colors.status.warning : colors.border.default}
              style={styles.star}
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
    marginVertical: 10,
  },
  star: {
    marginHorizontal: 4,
  },
});
