import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { DriverRuntimeEntry } from '../src/features/ride-runtime/RuntimeEntry';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';
import { TrackingScreen } from '../src/features/pilot/TrackingScreen';
import { Button } from '../src/shared/components/ui-v2';

const mockBack = jest.fn();
let mockParams: { rideId: string } | undefined = { rideId: 'ride' };
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: mockParams }),
  useNavigation: () => ({ goBack: mockBack }),
}));
jest.mock('react-native-config', () => ({
  KROW_PILOT_ENABLED: 'true',
  KROW_RUNTIME_ENABLED: 'false',
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../src/features/pilot/TrackingScreen', () => ({
  TrackingScreen: jest.fn(() => null),
}));
jest.mock('../src/features/pilot/ScheduledScreen', () => ({
  ScheduledScreen: () => null,
}));
jest.mock('../src/features/ride/screens/shared/RideScheduledScreen', () => ({
  RideScheduledScreen: () => null,
}));
jest.mock('../src/features/ride/screens/driver/DriverActiveRideScreen', () => ({
  DriverActiveRideScreen: () => null,
}));
jest.mock(
  '../src/features/ride/screens/passenger/PassengerActiveRideScreen',
  () => ({ PassengerActiveRideScreen: () => null }),
);
jest.mock('../src/features/ride-runtime/runtimeApi', () => ({
  runtimeApi: { snapshot: jest.fn() },
}));
jest.mock('../src/core/auth/sessionAdapter', () => ({
  sessionAdapter: { getSession: jest.fn() },
}));
jest.mock('../src/features/ride-runtime/sessionCache', () => ({
  sessionCache: { read: jest.fn() },
}));

let tree: Renderer.ReactTestRenderer;
beforeEach(() => {
  mockParams = { rideId: 'ride' };
  jest.clearAllMocks();
  jest.mocked(TrackingScreen).mockImplementation(() => <></>);
});
afterEach(async () => {
  if (tree) await act(() => tree.unmount());
  jest.restoreAllMocks();
});
async function mount() {
  await act(() => {
    tree = Renderer.create(
      <ThemeProvider>
        <DriverRuntimeEntry />
      </ThemeProvider>,
    );
  });
}
test('missing route parameters show a safe return action before opening tracking', async () => {
  mockParams = undefined;
  await mount();
  expect(JSON.stringify(tree.toJSON())).toContain('No pudimos abrir el viaje');
  expect(TrackingScreen).not.toHaveBeenCalled();
});
test('unexpected tracking render failure keeps a return action and can recover', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.mocked(TrackingScreen).mockImplementation(() => {
    throw new Error('incomplete map data');
  });
  await mount();
  expect(JSON.stringify(tree.toJSON())).toContain('No pudimos abrir la ruta');
  jest.mocked(TrackingScreen).mockImplementation(() => <></>);
  const retry = tree.root
    .findAllByType(Button)
    .find(node => node.props.title === 'Reintentar')!;
  await act(() => retry.props.onPress());
  expect(JSON.stringify(tree.toJSON())).not.toContain(
    'No pudimos abrir la ruta',
  );
});
