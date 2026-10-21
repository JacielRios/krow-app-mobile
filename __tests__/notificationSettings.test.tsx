import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { AppState, Platform, Switch } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';
import { NotificationSettings } from '../src/features/pilot/NotificationSettings';
import {
  getNotificationPermissionState,
  requestNotificationPermission,
} from '../src/features/pilot/notificationPermission';
import { registerPilotPush } from '../src/features/pilot/pilotPush';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) =>
    require('react').useEffect(callback, [callback]),
}));
jest.mock('../src/features/pilot/notificationPermission', () => ({
  getNotificationPermissionState: jest.fn(),
  requestNotificationPermission: jest.fn(),
}));
jest.mock('../src/features/pilot/pilotPush', () => ({
  registerPilotPush: jest.fn(),
}));
jest.mock('../src/features/ride-runtime/pushRegistration', () => ({
  registerTripNotifications: jest.fn(),
}));
let tree: Renderer.ReactTestRenderer;
let foreground: ((state: AppStateStatus) => void) | undefined;
const os = Platform.OS,
  version = Platform.Version;
beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'android';
  Object.defineProperty(Platform, 'Version', { configurable: true, value: 33 });
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, handler) => {
      foreground = handler;
      return { remove: jest.fn() };
    });
  jest.mocked(getNotificationPermissionState).mockResolvedValue('denied');
  jest.mocked(registerPilotPush).mockResolvedValue(undefined);
});
afterEach(async () => {
  if (tree) await act(() => tree.unmount());
  jest.restoreAllMocks();
  Platform.OS = os;
  Object.defineProperty(Platform, 'Version', {
    configurable: true,
    value: version,
  });
});
async function mount() {
  await act(async () => {
    tree = Renderer.create(
      <ThemeProvider>
        <NotificationSettings />
      </ThemeProvider>,
    );
  });
}
const toggle = () => tree.root.findByType(Switch);
test('displays the real denied state, then rereads an external settings change on foreground', async () => {
  await mount();
  expect(toggle().props.value).toBe(false);
  expect(JSON.stringify(tree.toJSON())).toContain(
    'Desactivadas en el dispositivo',
  );
  jest.mocked(getNotificationPermissionState).mockResolvedValue('granted');
  await act(async () => foreground?.('active'));
  expect(toggle().props.value).toBe(true);
  expect(JSON.stringify(tree.toJSON())).toContain('Permiso activado');
  jest.mocked(getNotificationPermissionState).mockResolvedValue('denied');
  await act(async () => foreground?.('active'));
  expect(toggle().props.value).toBe(false);
});
test('a denied permission request never turns the switch on or registers delivery', async () => {
  jest.mocked(requestNotificationPermission).mockResolvedValue('denied');
  await mount();
  await act(async () => toggle().props.onValueChange(true));
  expect(toggle().props.value).toBe(false);
  expect(registerPilotPush).not.toHaveBeenCalled();
});
test('repeated taps cannot duplicate a pending permission prompt and delivery errors remain explicit', async () => {
  let allow!: (state: 'granted') => void;
  jest.mocked(requestNotificationPermission).mockImplementation(
    () =>
      new Promise(resolve => {
        allow = resolve;
      }),
  );
  await mount();
  await act(() => {
    const press = toggle().props.onValueChange;
    press(true);
    press(true);
  });
  expect(requestNotificationPermission).toHaveBeenCalledTimes(1);
  expect(toggle().props.disabled).toBe(true);
  jest.mocked(getNotificationPermissionState).mockResolvedValue('granted');
  jest.mocked(registerPilotPush).mockRejectedValueOnce(new Error('Offline'));
  await act(async () => allow('granted'));
  expect(toggle().props.value).toBe(true);
  expect(JSON.stringify(tree.toJSON())).toContain('no pudimos registrar');
});
test('a failed status read is shown as unknown rather than a false disabled permission', async () => {
  jest
    .mocked(getNotificationPermissionState)
    .mockRejectedValue(new Error('Native unavailable'));
  await mount();
  expect(toggle().props.disabled).toBe(true);
  expect(JSON.stringify(tree.toJSON())).toContain(
    'No se pudo verificar el permiso',
  );
  expect(JSON.stringify(tree.toJSON())).not.toContain(
    'Desactivadas en el dispositivo',
  );
});
