import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { DriverTripsScreen } from '../src/features/ride/screens/driver/DriverTripsScreen';
import {
  Button,
  IconButton,
  SegmentedControl,
} from '../src/shared/components/ui-v2';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));
jest.mock('../src/features/ride/hooks', () => ({
  useDriverTrips: () => ({
    trips: ['scheduled', 'in_progress', 'completed'].map((status, index) => ({
      rideId: String(index),
      status,
      canEdit: true,
      departureTime: '2026-10-21T12:00:00Z',
      originAddress: 'Campus',
      destinationAddress: 'Centro',
      availableSeats: 3,
      pricePerSeatCents: 3500,
      activeBookings: 0,
    })),
    loading: false,
    loadingMore: false,
    hasMore: false,
  }),
}));

test('keeps detail and edit actions working across trip filters', async () => {
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(
      <ThemeProvider>
        <DriverTripsScreen />
      </ThemeProvider>,
    );
  });
  const button = (title: string) =>
    tree.root.findAllByType(Button).find(node => node.props.title === title)!;
  await act(() => button('Ver viaje').props.onPress());
  expect(mockNavigate).toHaveBeenLastCalledWith('RideScheduled', {
    rideId: '0',
  });
  await act(() =>
    tree.root
      .findAllByType(IconButton)
      .find(node => node.props.accessibilityLabel === 'Editar viaje')!
      .props.onPress(),
  );
  expect(mockNavigate).toHaveBeenLastCalledWith('PublishRide', {
    editRideId: '0',
  });
  await act(() =>
    tree.root.findByType(SegmentedControl).props.onChange('active'),
  );
  await act(() => button('Ver viaje').props.onPress());
  expect(mockNavigate).toHaveBeenLastCalledWith('DriverActiveRide', {
    rideId: '1',
  });
  await act(() =>
    tree.root.findByType(SegmentedControl).props.onChange('history'),
  );
  await act(() => button('Ver viaje').props.onPress());
  expect(mockNavigate).toHaveBeenLastCalledWith('DriverFinishedRide', {
    rideId: '2',
  });
  await act(() => tree.unmount());
});
