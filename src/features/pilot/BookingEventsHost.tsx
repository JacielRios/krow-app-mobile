import React, { useEffect, useRef, useState } from 'react';
import { AppState, ScrollView } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatedModal } from '../../shared/components/ui-v2/AnimatedModal';
import { Button } from '../../shared/components/ui-v2';
import {
  acknowledgeBooking,
  readBookingReceipts,
  unseenBookingNotices,
} from './bookingEvents';
import { useBookingInbox } from './useBookingInbox';
import { BookingNoticeCard } from './BookingNoticeCard';
import { invalidateRideLists } from '../ride/hooks/invalidateRideLists';

export function BookingEventsHost({
  actorId,
  routeName,
  onOpen,
}: {
  actorId: string;
  routeName: string;
  onOpen: (bookingId: string, rideId: string) => void;
}) {
  const inbox = useBookingInbox(actorId);
  const refreshInbox = inbox.refetch;
  const cache = useQueryClient();
  const receipts = useQuery({
    queryKey: ['booking-seen', actorId],
    queryFn: () => readBookingReceipts(actorId),
    staleTime: Infinity,
  });
  const [postponed, setPostponed] = useState(new Set<string>());
  const [active, setActive] = useState(AppState.currentState === 'active');
  const previous = useRef('');
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      setActive(state === 'active');
      if (state === 'active') void refreshInbox();
    });
    return () => {
      listener.remove();
    };
  }, [actorId, refreshInbox]);
  const signature = (inbox.data ?? [])
    .map(item => `${item.eventKey}:${item.rideStatus}`)
    .join('|');
  useEffect(() => {
    if (previous.current === signature) return;
    previous.current = signature;
    void invalidateRideLists(cache);
    void cache.invalidateQueries({ queryKey: ['ride-context', actorId] });
    void cache.invalidateQueries({ queryKey: ['active-detail', actorId] });
    void cache.invalidateQueries({ queryKey: ['pending-count', actorId] });
  }, [signature, cache, actorId]);
  const next = receipts.data
    ? unseenBookingNotices(inbox.data ?? [], receipts.data, postponed)[0]
    : undefined;
  const allowed = ['Home', 'Inicio', 'Viajes', 'RideScheduled'].includes(
    routeName,
  );
  const visible = active && allowed && !!next && !inbox.isError;
  const postpone = () => {
    if (next) setPostponed(current => new Set(current).add(next.eventKey));
  };
  // Results are acknowledged durably only by an explicit user action. Merely
  // polling/receiving push must never consume a passenger confirmation.
  const read = async () => {
    if (next)
      cache.setQueryData(
        ['booking-seen', actorId],
        await acknowledgeBooking(actorId, next.eventKey),
      );
  };
  return (
    <AnimatedModal visible={visible} onDismissRequest={postpone}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {next && (
          <BookingNoticeCard
            key={next.eventKey}
            item={next}
            actorId={actorId}
            fresh={!inbox.isError && !inbox.isFetching}
            onChanged={inbox.refetch}
            onRead={next.role === 'passenger' ? read : undefined}
            onOpen={async () => {
              if (next.role === 'passenger') await read();
              postpone();
              onOpen(next.bookingId, next.rideId);
            }}
          />
        )}
        <Button title="Revisar después" variant="text" onPress={postpone} />
      </ScrollView>
    </AnimatedModal>
  );
}
