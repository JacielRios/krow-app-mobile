import React, { useState } from 'react';
import { StarRating as SharedStarRating } from '../../../shared/components/ui/StarRating';
interface StarRatingProps {
  maxStars?: number;
  rating?: number;
  onRatingChange?: (rating: number) => void;
  size?: number;
  disabled?: boolean;
}
/** Compatibility adapter preserving the existing local selection. */
export const StarRating: React.FC<StarRatingProps> = ({
  maxStars = 5,
  rating: initialRating = 0,
  onRatingChange,
  size = 32,
  disabled = false,
}) => {
  const [rating, setRating] = useState(initialRating);
  return (
    <SharedStarRating
      value={rating}
      maxStars={maxStars}
      size={size}
      readOnly={disabled}
      style={{ justifyContent: 'center', marginVertical: 10 }}
      onChange={value => {
        setRating(value);
        onRatingChange?.(value);
      }}
    />
  );
};
