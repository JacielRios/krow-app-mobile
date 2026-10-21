import {
  readWithCache,
  type ReadResult,
} from '../../core/offline/readOnlyCache';
import { userApi, type CurrentUserResponse } from '../auth/api/userApi';
import { pilotApi, type ActivityItem } from './pilotApi';

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object';
const text = (value: unknown) =>
  value === null || (typeof value === 'string' && value.length <= 2048);
const money = (value: unknown) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const validActivity = (value: unknown): value is ActivityItem[] =>
  Array.isArray(value) &&
  value.length <= 30 &&
  value.every(
    item =>
      record(item) &&
      typeof item.rideId === 'string' &&
      typeof item.status === 'string' &&
      typeof item.departureTime === 'string' &&
      Number.isFinite(Date.parse(item.departureTime)) &&
      text(item.originAddress) &&
      text(item.destinationAddress) &&
      text(item.bookingId) &&
      text(item.bookingStatus) &&
      (item.amountCents === null || money(item.amountCents)) &&
      money(item.pricePerSeatCents),
  );

export async function readProfile(actor: string) {
  const result = await readWithCache(
    actor,
    'profile',
    async () => {
      const value = await userApi.me(actor);
      return {
        userId: value.userId,
        email: value.email,
        fullName: value.fullName,
        institutionalId: value.institutionalId,
        academicProgram: value.academicProgram,
        academicPeriod: value.academicPeriod,
        profilePhoto: value.profilePhoto,
        rating: value.rating,
        role: value.role,
        canPublishRides: value.canPublishRides,
        driverProfile: value.driverProfile
          ? {
              driverId: value.driverProfile.driverId,
              status: value.driverProfile.status,
              rating: value.driverProfile.rating,
            }
          : null,
      };
    },
    (value): value is CurrentUserResponse =>
      record(value) &&
      value.userId === actor &&
      text(value.email) &&
      text(value.fullName) &&
      text(value.profilePhoto) &&
      (value.role === 'conductor' || value.role === 'pasajero') &&
      typeof value.canPublishRides === 'boolean' &&
      (value.driverProfile === null ||
        (record(value.driverProfile) &&
          typeof value.driverProfile.driverId === 'string' &&
          text(value.driverProfile.status))),
  );
  return {
    ...result.data,
    canPublishRides: result.source === 'network' && result.data.canPublishRides,
    offlineSavedAt: result.source === 'cache' ? result.savedAt : undefined,
  };
}
export function readActivity(
  actor: string,
  context: 'driver' | 'passenger',
  group: 'upcoming' | 'active' | 'history',
  offset: number,
): Promise<ReadResult<ActivityItem[]>> {
  const load = async () => {
    const data = await pilotApi.activity(context, group, offset, actor);
    if (!validActivity(data))
      throw new Error('No pudimos leer la lista de viajes.');
    return data.map(item => ({
      rideId: item.rideId,
      status: item.status,
      departureTime: item.departureTime,
      originAddress: item.originAddress,
      destinationAddress: item.destinationAddress,
      bookingId: item.bookingId,
      bookingStatus: item.bookingStatus,
      amountCents: item.amountCents,
      pricePerSeatCents: item.pricePerSeatCents,
    }));
  };
  if (offset === 0)
    return readWithCache(
      actor,
      `activity.${context}.${group}`,
      load,
      validActivity,
    );
  return load().then(data => ({
    data,
    source: 'network',
    savedAt: Date.now(),
  }));
}
