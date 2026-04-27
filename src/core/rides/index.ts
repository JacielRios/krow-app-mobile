export type RideStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface HistoryRide {
  id: string;
  status: RideStatus;
  departureTime: string;
  reservedSeats: number;
  publishedAt: string;
  companions?: Companion[];
}

export interface Companion {
  id: string;
  name: string;
  photo: string;
  rating: number;
}

export interface Section {
  title: string;
  data: HistoryRide[];
}