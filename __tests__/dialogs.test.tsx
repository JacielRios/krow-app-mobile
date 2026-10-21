import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Modal } from 'react-native';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';
import {
  DialogHost,
  DialogProvider,
} from '../src/shared/components/ui-v2/DialogHost';
import { AnimatedModal } from '../src/shared/components/ui-v2/AnimatedModal';
import {
  KrowAlert,
  dialogStore,
} from '../src/shared/components/ui-v2/dialogService';
import { Button } from '../src/shared/components/ui-v2/Button';
import { CustomAlert } from '../src/shared/components/ui/CustomAlert';
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
let tree: Renderer.ReactTestRenderer;
afterEach(async () => {
  if (tree) await act(() => tree.unmount());
  KrowAlert.clear();
});
async function mount(child?: React.ReactNode) {
  await act(async () => {
    tree = Renderer.create(
      <ThemeProvider>
        {child}
        <DialogHost />
      </ThemeProvider>,
    );
  });
}
test('confirmation is deliberate, cancel has no side effect and double acceptance runs once', async () => {
  const accept = jest.fn();
  await mount();
  await act(() => {
    KrowAlert.alert('Cerrar sesión', 'Se detendrá el GPS.', [
      { text: 'Volver', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: accept },
    ]);
  });
  expect(accept).not.toHaveBeenCalled();
  expect(tree.root.findAllByType(Modal)).toHaveLength(1);
  const button = (title: string) =>
    tree.root.findAllByType(Button).find(b => b.props.title === title)!;
  await act(() => button('Volver').props.onPress!({} as never));
  expect(accept).not.toHaveBeenCalled();
  await act(() => {
    KrowAlert.alert('Cerrar sesión', 'Se detendrá el GPS.', [
      { text: 'Cerrar sesión', style: 'destructive', onPress: accept },
    ]);
  });
  const press = button('Cerrar sesión').props.onPress!;
  await act(() => {
    press({} as never);
    press({} as never);
  });
  expect(accept).toHaveBeenCalledTimes(1);
});
test('feedback is queued, old callbacks cannot resolve a newer dialog and clearing drops account actions', async () => {
  const stale = jest.fn(),
    next = jest.fn();
  KrowAlert.alert('Primero', '', [{ text: 'Continuar', onPress: stale }]);
  const first = dialogStore.getSnapshot()!;
  KrowAlert.alert('Segundo', '', [{ text: 'Continuar', onPress: next }], {
    type: 'success',
  });
  dialogStore.resolve(first.id, 0);
  dialogStore.resolve(first.id, 0);
  expect(stale).toHaveBeenCalledTimes(1);
  expect(next).not.toHaveBeenCalled();
  expect(dialogStore.getSnapshot()?.options.type).toBe('success');
  KrowAlert.clear();
  expect(dialogStore.getSnapshot()).toBeNull();
});
test('a blocking cancelled-ride notice ignores native back and acknowledges only from its action', async () => {
  const close = jest.fn();
  await mount(
    <CustomAlert
      visible
      type="warning"
      title="Viaje cancelado"
      message="Regresa al inicio."
      dismissOnBack={false}
      onClose={close}
    />,
  );
  await act(() => tree.root.findByType(Modal).props.onRequestClose());
  expect(close).not.toHaveBeenCalled();
  await act(() => tree.root.findByType(Button).props.onPress!({} as never));
  expect(close).toHaveBeenCalledTimes(1);
});

test('a dialog inside a sheet shares its native window and hardware back cannot dismiss the sheet behind it', async () => {
  const dismissSheet = jest.fn();
  await act(async () => {
    tree = Renderer.create(
      <ThemeProvider>
        <DialogProvider>
          <AnimatedModal visible onDismissRequest={dismissSheet}>
            <Button title="Elegir parada" />
          </AnimatedModal>
        </DialogProvider>
      </ThemeProvider>,
    );
  });
  await act(() => {
    KrowAlert.alert('No se pudo solicitar', 'Revisa la conexión.', undefined, {
      type: 'error',
    });
  });
  expect(tree.root.findAllByType(Modal)).toHaveLength(1);
  await act(() => tree.root.findByType(Modal).props.onRequestClose());
  expect(dismissSheet).not.toHaveBeenCalled();
  expect(dialogStore.getSnapshot()?.title).toBe('No se pudo solicitar');
  await act(() =>
    tree.root.findAllByType(Button).find(b => b.props.title === 'Entendido')!
      .props.onPress!({} as never),
  );
  await act(() => tree.root.findByType(Modal).props.onRequestClose());
  expect(dismissSheet).toHaveBeenCalledTimes(1);
});
