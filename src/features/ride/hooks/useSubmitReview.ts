import { useState } from 'react';
import { supabase } from '../../../services/supabase';

export interface SubmitReviewResult {
  reviewId: string | null;
  error: string | null;
}

/**
 * Envía una calificación/review para un participante de un viaje completado.
 * La RPC `submit_review` valida participación y hace upsert. Un trigger
 * actualiza automáticamente `users.rating` y `driver_profiles.rating`.
 */
export function useSubmitReview() {
  const [loading, setLoading] = useState(false);

  const submitReview = async (
    rideId: string,
    revieweeId: string,
    rating: number,
    comment?: string,
  ): Promise<SubmitReviewResult> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('submit_review', {
        p_ride_id: rideId,
        p_reviewee_id: revieweeId,
        p_rating: rating,
        p_comment: comment ?? null,
      });
      if (error) return { reviewId: null, error: error.message };
      return { reviewId: data as string, error: null };
    } finally {
      setLoading(false);
    }
  };

  return { submitReview, loading };
}
