import { ListRow } from '../../shared/components/ui-v2';
import React, { useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { MainStackParamList } from '../../app/navigation/MainNavigator';
import { useCurrentUserRole } from '../home/hooks/useCurrentUserRole';
import {
  Button,
  FeedbackState,
  ScreenContainer,
  Skeleton,
  Text,
} from '../../shared/components/ui-v2';
import { ScreenHeader } from '../../shared/components/ui-v2/ScreenHeader';
import {
  TripFacts,
  TripNotice,
  TripRoute,
} from '../ride/components/TripPresentation';
import { money, rideDate } from '../../shared/format';
import { pilotApi } from './pilotApi';
import { bookingApi } from '../ride/api/bookingApi';
import { invalidateRideLists } from '../ride/hooks/invalidateRideLists';

export function RideInvitationScreen() {
  const { rideId } = useRoute().params as { rideId: string };
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const cache = useQueryClient();
  const { user, loading, error: userError, reload } = useCurrentUserRole();
  const actorId = user?.userId;
  const query = useQuery({
    queryKey: ['ride-invitation', actorId, rideId],
    queryFn: () => pilotApi.invitation(rideId, actorId!),
    enabled: !!actorId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 5000,
    refetchOnWindowFocus: 'always',
    retry: 1,
  });
  const data = query.data;
  const [pickupId, setPickupId] = useState('');
  const [dropoffId, setDropoffId] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const lock = useRef(false);
  useEffect(() => {
    setPickupId('');
    setDropoffId('');
    setFeedback('');
  }, [rideId, actorId]);
  useEffect(() => {
    if (!query.isFetching && !query.isError && (data?.owned || data?.bookingId))
      nav.replace('RideScheduled', { rideId });
  }, [
    data?.owned,
    data?.bookingId,
    nav,
    rideId,
    query.isFetching,
    query.isError,
  ]);
  const pickup = data?.stops.find(s => s.stopId === pickupId);
  const dropoff = data?.stops.find(s => s.stopId === dropoffId);
  const validPair = !!pickup && !!dropoff && pickup.order < dropoff.order;
  const request = async () => {
    if (
      lock.current ||
      !actorId ||
      !validPair ||
      !data?.canRequest ||
      query.isError
    )
      return;
    lock.current = true;
    setBusy(true);
    setFeedback('');
    try {
      const current = await pilotApi.invitation(rideId, actorId);
      if (current.bookingId) {
        nav.replace('RideScheduled', { rideId });
        return;
      }
      const first = current.stops.find(s => s.stopId === pickupId);
      const last = current.stops.find(s => s.stopId === dropoffId);
      if (!current.canRequest || !first || !last || first.order >= last.order)
        throw new Error(
          'El viaje o sus paradas cambiaron. Actualiza la invitación.',
        );
      await bookingApi.request(rideId, pickupId, dropoffId, 1, actorId);
      nav.replace('RideScheduled', { rideId });
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'No pudimos enviar la solicitud.',
      );
    } finally {
      await Promise.allSettled([
        query.refetch(),
        invalidateRideLists(cache),
        cache.invalidateQueries({ queryKey: ['booking-inbox', actorId] }),
      ]);
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <ScreenContainer padded>
      <ScrollView
        contentContainerStyle={{ gap: 20, paddingVertical: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching}
            onRefresh={() => {
              if (actorId) void query.refetch();
              else reload();
            }}
          />
        }
      >
        <ScreenHeader
          title="Invitación a un viaje"
          onBack={() => nav.goBack()}
        />
        {(loading || query.isLoading) && !data && <Skeleton height={220} />}
        {!!(query.error || userError) && (
          <FeedbackState
            kind="error"
            title="No pudimos abrir la invitación"
            description={userError ?? query.error?.message}
            actionLabel="Actualizar"
            onAction={() => {
              if (actorId) void query.refetch();
              else reload();
            }}
          />
        )}
        {data && (
          <>
            <TripRoute origin={data.origin} destination={data.destination} />
            <Text variant="title">{rideDate(data.departureTime)}</Text>
            <Text>
              {data.driverName} · {data.vehicle}
            </Text>
            <TripFacts
              items={[
                {
                  icon: 'people-outline',
                  label: 'Disponibles',
                  value: String(data.availableSeats),
                },
                {
                  icon: 'payments',
                  label: 'Por lugar',
                  value: money(data.pricePerSeatCents),
                },
              ]}
            />
            <TripNotice
              title="La invitación no reserva un lugar"
              description="Selecciona tus paradas y envía una solicitud. El conductor debe aprobarla antes de confirmar tu lugar."
            />
            {!data.canRequest && !data.owned && !data.bookingId && (
              <Text>Este viaje ya no admite solicitudes.</Text>
            )}
            {data.canRequest && (
              <>
                <Text variant="title">Punto de subida</Text>
                <View style={{ gap: 8 }}>
                  {data.stops.slice(0, -1).map(stop => (
                    <ListRow
                      key={stop.stopId}
                      title={stop.address}
                      disabled={busy}
                      onPress={() => {
                        setPickupId(stop.stopId);
                        setDropoffId('');
                      }}
                      selected={pickupId === stop.stopId}
                      accessibilityRole="radio"
                      accessibilityLabel={`Subir en ${stop.address}`}
                      iconName="trip-origin"
                    />
                  ))}
                </View>
                {pickup && (
                  <>
                    <Text variant="title">Punto de bajada</Text>
                    <View style={{ gap: 8 }}>
                      {data.stops
                        .filter(stop => stop.order > pickup.order)
                        .map(stop => (
                          <ListRow
                            key={stop.stopId}
                            title={stop.address}
                            disabled={busy}
                            onPress={() => setDropoffId(stop.stopId)}
                            selected={dropoffId === stop.stopId}
                            accessibilityRole="radio"
                            accessibilityLabel={`Bajar en ${stop.address}`}
                            iconName="place"
                          />
                        ))}
                    </View>
                  </>
                )}
                <Button
                  title="Solicitar un lugar"
                  disabled={!validPair || query.isError || query.isFetching}
                  loading={busy}
                  onPress={() => void request()}
                  iconName="event-seat"
                />
              </>
            )}
          </>
        )}
        {!!feedback && <Text accessibilityLiveRegion="polite">{feedback}</Text>}
      </ScrollView>
    </ScreenContainer>
  );
}
