import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { AppState, type AppStateStatus } from 'react-native';
import { useNotificationPermissionStartup } from '../src/features/pilot/useNotificationPermissionStartup';
import { requestStartupNotificationPermission } from '../src/features/pilot/notificationPermission';

jest.mock('react-native-config', () => ({ KROW_PILOT_PUSH_ENABLED: 'true' }));
jest.mock('../src/features/pilot/notificationPermission', () => ({
  requestStartupNotificationPermission: jest.fn(),
}));
let ready: boolean;
function Startup() {
  ready = useNotificationPermissionStartup();
  return null;
}
test('a background launch waits for an active Activity and does not block navigation on denial', async () => {
  const oldState = AppState.currentState;
  Object.assign(AppState, { currentState: 'background' });
  let resume!: (state: AppStateStatus) => void;
  const remove = jest.fn();
  const listener = jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_name, handler) => {
      resume = handler;
      return { remove };
    });
  jest.mocked(requestStartupNotificationPermission).mockResolvedValue(false);
  let tree!: Renderer.ReactTestRenderer;
  try {
    await act(async () => {
      tree = Renderer.create(<Startup />);
    });
    expect(ready).toBe(false);
    expect(requestStartupNotificationPermission).not.toHaveBeenCalled();
    await act(async () => {
      resume('active');
    });
    expect(ready).toBe(true);
    await act(async () => {
      resume('active');
    });
    expect(requestStartupNotificationPermission).toHaveBeenCalledTimes(1);
    await act(() => tree.unmount());
    expect(remove).toHaveBeenCalled();
  } finally {
    listener.mockRestore();
    Object.assign(AppState, { currentState: oldState });
  }
});
