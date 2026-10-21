import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';
import { RequestsShortcut } from '../src/features/pilot/RequestsShortcut';
import { AnimatedPressable } from '../src/shared/components/ui-v2/AnimatedPressable';
test('pending requests expose their real count and one accessible entry action, including large counts', async () => {
  const open = jest.fn();
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(
      <ThemeProvider>
        <RequestsShortcut pending={120} driver onPress={open} />
      </ThemeProvider>,
    );
  });
  const target = tree.root.findByType(AnimatedPressable);
  expect(target.props.accessibilityLabel).toContain(
    '120 solicitudes pendientes',
  );
  expect(JSON.stringify(tree.toJSON())).toContain('99+');
  await act(() => target.props.onPress!({} as never));
  expect(open).toHaveBeenCalledTimes(1);
  await act(() =>
    tree.update(
      <ThemeProvider>
        <RequestsShortcut pending={120} driver error onPress={open} />
      </ThemeProvider>,
    ),
  );
  expect(
    tree.root.findByType(AnimatedPressable).props.accessibilityLabel,
  ).toContain('No pudimos actualizar');
  expect(JSON.stringify(tree.toJSON())).not.toContain('99+');
  await act(() =>
    tree.update(
      <ThemeProvider>
        <RequestsShortcut pending={120} driver={false} onPress={open} />
      </ThemeProvider>,
    ),
  );
  expect(
    tree.root.findByType(AnimatedPressable).props.accessibilityLabel,
  ).toContain('Consulta el estado de tus reservas');
  expect(JSON.stringify(tree.toJSON())).not.toContain('99+');
  await act(() => tree.unmount());
});
