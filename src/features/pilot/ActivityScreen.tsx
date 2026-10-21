import { KrowAlert as Alert } from '../../shared/components/ui-v2/dialogService';
import { TripListItem } from '../ride/components/TripPresentation';
import React, { useCallback, useState } from 'react';
import { FlatList, View, RefreshControl } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../app/navigation/MainNavigator';
import { useCurrentUserRole } from '../home/hooks/useCurrentUserRole';
import { type ActivityItem } from './pilotApi';
import { readActivity } from './readOnlyQueries';
import { ApiError } from '../../core/api/apiClient';
import {
  ScreenContainer,
  Text,
  SegmentedControl,
  Button,
  Skeleton,
  FeedbackState,
} from '../../shared/components/ui-v2';
import { ScreenHeader } from '../../shared/components/ui-v2/ScreenHeader';
import { money } from '../../shared/format';
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
    refetchOnWindowFocus: 'always',
    queryFn: ({ pageParam }) =>
      readActivity(user!.userId, context, group, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      last.source === 'network' && last.data.length === 30
        ? pages.length * 30
        : undefined,
    refetchInterval: query =>
      query.state.data?.pages.some(page => page.source === 'cache')
        ? 15000
        : false,
  });
  const denied =
    q.error instanceof ApiError && [401, 403].includes(q.error.status);
  const trips = denied ? [] : q.data?.pages.flatMap(page => page.data) ?? [];
  const cached = q.data?.pages.find(page => page.source === 'cache');
  const actorId = user?.userId;
  const refreshActivity = q.refetch;
  useFocusEffect(
    useCallback(() => {
      if (actorId) void refreshActivity();
    }, [actorId, refreshActivity]),
  );
  const open = (trip: ActivityItem) => {
    if (cached || user?.offlineSavedAt) {
      Alert.alert(
        'Información guardada',
        'Conéctate para abrir el detalle y confirmar el estado actual del viaje.',
      );
      return;
    }
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
      <FlatList
        data={trips}
        keyExtractor={trip => trip.bookingId ?? trip.rideId}
        contentContainerStyle={{ paddingVertical: 24, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={q.isRefetching}
            onRefresh={() => void q.refetch()}
            tintColor={theme.colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <ScreenHeader
              title="Tus viajes"
              subtitle={
                context === 'driver'
                  ? 'Los viajes que conduces, en un solo lugar.'
                  : 'Tus reservas y próximos encuentros.'
              }
            />
            <SegmentedControl
              value={group}
              onChange={setGroup}
              options={[
                { value: 'upcoming', label: 'Próximos' },
                { value: 'active', label: 'En curso' },
                { value: 'history', label: 'Historial' },
              ]}
            />
            {cached && !denied && (
              <View style={{ gap: 8, marginTop: 16 }}>
                <Text tone="secondary" accessibilityLiveRegion="polite">
                  Sin acceso a la API. Información guardada el{' '}
                  {new Date(cached.savedAt).toLocaleString('es-MX')}. El estado
                  puede haber cambiado.
                </Text>
                <Button
                  title="Actualizar viajes"
                  variant="text"
                  onPress={() => void q.refetch()}
                  iconName="refresh"
                />
              </View>
            )}
          </View>
        }
        renderItem={({ item: trip }) => (
          <TripListItem
            origin={trip.originAddress}
            destination={trip.destinationAddress}
            departure={trip.departureTime}
            status={trip.bookingStatus ?? trip.status}
            amount={money(trip.amountCents ?? trip.pricePerSeatCents)}
            onPress={() => open(trip)}
          />
        )}
        ListEmptyComponent={
          userLoading || q.isLoading ? (
            <Skeleton height={180} />
          ) : userError || q.error ? (
            <FeedbackState
              kind="error"
              title="No pudimos cargar tus viajes"
              description={userError ?? q.error?.message}
              actionLabel="Reintentar"
              onAction={() => (user ? void q.refetch() : reload())}
            />
          ) : (
            <FeedbackState
              title="Aún no tienes viajes aquí"
              description="Tus viajes aparecerán conforme cambien de estado."
            />
          )
        }
        ListFooterComponent={
          <View style={{ gap: 16, marginTop: 16 }}>
            {!!q.error && !!trips.length && (
              <Text tone="error" accessibilityLiveRegion="polite">
                No se pudo actualizar. Se conservan tus viajes.
              </Text>
            )}
            {q.hasNextPage && (
              <Button
                title="Cargar más"
                variant="ghost"
                loading={q.isFetchingNextPage}
                onPress={() => void q.fetchNextPage()}
              />
            )}
          </View>
        }
      />
    </ScreenContainer>
  );
}
