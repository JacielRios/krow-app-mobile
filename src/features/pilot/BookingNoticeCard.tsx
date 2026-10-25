import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Text } from '../../shared/components/ui-v2';
import { Avatar } from '../../shared/components/ui/Avatar';
import {
  TripFacts,
  TripNotice,
  TripRoute,
  TripStatus,
} from '../ride/components/TripPresentation';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { money, rideDate } from '../../shared/format';
import { pilotApi, type BookingNotice } from './pilotApi';
import { bookingApi } from '../ride/api/bookingApi';
import { invalidateRideLists } from '../ride/hooks/invalidateRideLists';

export function BookingNoticeCard({
  item,
  actorId,
  fresh,
  onChanged,
  onOpen,
  onRead,
}: {
  item: BookingNotice;
  actorId: string;
  fresh: boolean;
  onChanged: () => Promise<unknown>;
  onOpen: () => void | Promise<void>;
  onRead?: () => Promise<unknown>;
}) {
  const { theme } = useTheme();
  const cache = useQueryClient();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const respond = async (target: 'confirmed' | 'rejected') => {
    if (lock.current || !fresh) return;
    lock.current = true;
    setBusy(true);
    setFeedback('');
    try {
      const current = await pilotApi.bookingNotice(item.bookingId, actorId);
      if (!current.canRespond)
        throw new Error('La solicitud cambió o ya no está disponible.');
      await bookingApi.updateStatus(item.bookingId, target, actorId);
      setFeedback(
        target === 'confirmed' ? 'Solicitud aceptada' : 'Solicitud rechazada',
      );
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'No pudimos responder. Revisa tu conexión.',
      );
    } finally {
      // Never turn a confirmed mutation into failure because a refresh failed.
      await Promise.allSettled([
        onChanged(),
        invalidateRideLists(cache),
        cache.invalidateQueries({ queryKey: ['booking-inbox', actorId] }),
      ]);
      lock.current = false;
      setBusy(false);
    }
  };
  const driver = item.role === 'driver';
  const guidance = driver
    ? item.canRespond
      ? 'Revisa la subida, la bajada y la aportación antes de responder.'
      : 'Consulta el estado y los detalles de esta reserva.'
    : item.status === 'confirmed'
    ? 'Tu lugar está reservado. Revisa el punto de encuentro antes de salir.'
    : item.status === 'pending'
    ? 'Espera la respuesta del conductor. Enviar la solicitud todavía no reserva tu lugar.'
    : item.status === 'rejected' || item.status === 'cancelled'
    ? 'Esta reserva ya no está disponible. Puedes buscar otro viaje.'
    : 'Consulta el detalle para revisar el estado de tu reserva.';
  return (
    <View
      style={{
        gap: 16,
        padding: 20,
        backgroundColor: theme.colors.surfaceRaised,
        borderRadius: 24,
      }}
    >
      <Text variant="title" accessibilityRole="header">
        {driver
          ? item.canRespond
            ? 'Solicitud para tu viaje'
            : 'Estado de la solicitud'
          : item.status === 'confirmed'
          ? '¡Tu lugar está confirmado!'
          : 'Tu solicitud cambió'}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar
          name={(driver ? item.passengerName : item.driverName) ?? undefined}
          size="lg"
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="title">
            {(driver ? item.passengerName : item.driverName) ||
              'Participante del viaje'}
          </Text>
          <Text tone="secondary">{rideDate(item.departureTime)}</Text>
        </View>
      </View>
      <TripStatus status={item.status} />
      <Text tone="secondary">{guidance}</Text>
      <TripRoute
        origin={item.pickupAddress}
        destination={item.dropoffAddress}
        originLabel="Subida solicitada"
        destinationLabel="Parada de bajada"
      />
      {!driver && !!item.vehicle && <Text>{item.vehicle}</Text>}
      <TripFacts
        items={[
          { icon: 'event-seat', label: 'Lugares', value: String(item.seats) },
          {
            icon: 'payments',
            label: 'Total en efectivo',
            value: money(item.amountCents),
          },
        ]}
      />
      {!fresh && (
        <TripNotice
          title="Verifica la conexión"
          description="La información puede haber cambiado. Actualiza antes de responder."
        />
      )}
      {driver && item.canRespond && (
        <View style={{ gap: 8 }}>
          <Button
            title="Aceptar solicitud"
            loading={busy}
            disabled={!fresh || busy}
            onPress={() => void respond('confirmed')}
          />
          <Button
            title="Rechazar solicitud"
            variant="outline"
            disabled={!fresh || busy}
            onPress={() => void respond('rejected')}
          />
        </View>
      )}
      {driver && !item.canRespond && (
        <Text tone="secondary">
          Esta solicitud ya fue atendida o dejó de estar disponible.
        </Text>
      )}
      <Button
        title="Ver detalle del viaje"
        variant="text"
        disabled={busy}
        onPress={() => {
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          void Promise.resolve()
            .then(onOpen)
            .catch(() =>
              setFeedback('No pudimos abrir el detalle. Vuelve a intentar.'),
            )
            .finally(() => {
              lock.current = false;
              setBusy(false);
            });
        }}
      />
      {onRead && (
        <Button
          title="Entendido"
          variant="outline"
          disabled={busy}
          onPress={() => {
            if (lock.current) return;
            lock.current = true;
            setBusy(true);
            void onRead()
              .catch(() =>
                setFeedback(
                  'No pudimos guardar el aviso visto. Intenta de nuevo.',
                ),
              )
              .finally(() => {
                lock.current = false;
                setBusy(false);
              });
          }}
        />
      )}
      {!!feedback && <Text accessibilityLiveRegion="polite">{feedback}</Text>}
    </View>
  );
}
