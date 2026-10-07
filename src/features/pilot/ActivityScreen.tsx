import React, { useState } from 'react';
import { ScrollView, View, RefreshControl } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../app/navigation/MainNavigator';
import { useCurrentUserRole } from '../home/hooks/useCurrentUserRole';
import { pilotApi, type ActivityItem } from './pilotApi';
import {
  ScreenContainer,
  Text,
  Card,
  Button,
  Skeleton,
  FeedbackState,
  StatusBadge,
} from '../../shared/components/ui-v2';
import { ScreenHeader } from '../../shared/components/ui-v2/ScreenHeader';
import { money, rideDate, statusText } from '../../shared/format';
import { useTheme } from '../../shared/theme/ThemeProvider';
export function ActivityScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { theme } = useTheme();
  const {
    user,
    loading: userLoading,
    error: userError,
    reload,
  } = useCurrentUserRole();
  const [group, setGroup] = useState<'upcoming' | 'active' | 'history'>(
    'upcoming',
  );
  const context = user?.role === 'conductor' ? 'driver' : 'passenger';
  const q = useInfiniteQuery({
    queryKey: ['activity', user?.userId, context, group],
    enabled: !!user,
    queryFn: ({ pageParam }) => pilotApi.activity(context, group, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      last.length === 30 ? pages.length * 30 : undefined,
  });
  const trips = q.data?.pages.flat() ?? [];
  const open = (trip: ActivityItem) => {
    const rideId = trip.rideId;
    if (
      group === 'history' ||
      ['cancelled', 'completed', 'rejected', 'no_show', 'interrupted'].includes(
        trip.bookingStatus ?? '',
      )
    )
      navigation.navigate('RideHistory', { rideId });
    else if (trip.status === 'in_progress')
      navigation.navigate(
        context === 'driver' ? 'DriverActiveRide' : 'PassengerActiveRide',
        { rideId },
      );
    else navigation.navigate('RideScheduled', { rideId });
  };
  return (
    <ScreenContainer padded safeBottom={false}>
      <ScrollView
        contentContainerStyle={{ paddingVertical: 24, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={q.isRefetching}
            onRefresh={() => void q.refetch()}
            tintColor={theme.colors.primary}
          />
        }
      >
        <ScreenHeader
          title="Tus viajes"
          subtitle={
            context === 'driver'
              ? 'Los viajes que conduces, en un solo lugar.'
              : 'Tus reservas y próximos encuentros.'
          }
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['upcoming', 'active', 'history'] as const).map((g, i) => (
            <Button
              key={g}
              title={['Próximos', 'En curso', 'Historial'][i]}
              variant={group === g ? 'primary' : 'outline'}
              fullWidth={false}
              onPress={() => setGroup(g)}
              accessibilityState={{ selected: g === group }}
            />
          ))}
        </View>
        {userLoading || q.isLoading ? (
          <Skeleton height={180} />
        ) : (userError || q.error) && !trips.length ? (
          <FeedbackState
            kind="error"
            title="No pudimos cargar tus viajes"
            description={userError ?? q.error?.message}
            actionLabel="Reintentar"
            onAction={() => (user ? void q.refetch() : reload())}
          />
        ) : !trips.length ? (
          <FeedbackState
            title="Aún no tienes viajes aquí"
            description="Tus viajes aparecerán conforme cambien de estado."
          />
        ) : (
          trips.map(trip => (
            <Card
              key={trip.bookingId ?? trip.rideId}
              onPress={() => open(trip)}
              accessibilityLabel={`${statusText(
                trip.bookingStatus ?? trip.status,
              )}. ${trip.originAddress} a ${
                trip.destinationAddress
              }. Ver detalles`}
            >
              <View style={{ gap: 12 }}>
                <StatusBadge
                  label={statusText(trip.bookingStatus ?? trip.status)}
                  tone={trip.status === 'cancelled' ? 'error' : 'info'}
                />
                <Text variant="title">
                  {trip.originAddress ?? 'Origen'} →{' '}
                  {trip.destinationAddress ?? 'Destino'}
                </Text>
                <Text tone="secondary">{rideDate(trip.departureTime)}</Text>
                <Text>{money(trip.amountCents ?? trip.pricePerSeatCents)}</Text>
                <Text tone="secondary" variant="caption">
                  Ver detalles →
                </Text>
              </View>
            </Card>
          ))
        )}
        {!!q.error && !!trips.length && (
          <Text tone="error" accessibilityLiveRegion="polite">
            No se pudo actualizar. Se conservan tus viajes.
          </Text>
        )}
        {q.hasNextPage && (
          <Button
            title="Cargar más"
            variant="outline"
            loading={q.isFetchingNextPage}
            onPress={() => void q.fetchNextPage()}
          />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
