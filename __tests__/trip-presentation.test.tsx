import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';
import { Button, StatusBadge } from '../src/shared/components/ui-v2';
import {
  TripRoute,
  TripStatus,
} from '../src/features/ride/components/TripPresentation';
import { placeLabel } from '../src/shared/placeLabel';

test.each([
  null,
  '',
  '   ',
  '25.6640, -100.2432',
  '(25.6640, -100.2432)',
  ', ,',
])('missing street names have an honest fallback: %s', address => {
  expect(placeLabel(address, 'Destino guardado')).toMatchObject({
    title: 'Destino guardado',
    unavailable: true,
  });
});
test('a short place name retains its full address for details', () => {
  const full = 'Av. Eloy Cavazos 7750, Guadalupe, N.L., México';
  expect(placeLabel(full, 'Destino')).toEqual({
    title: 'Av. Eloy Cavazos 7750',
    detail: 'Guadalupe, N.L., México',
    full,
    unavailable: false,
  });
});
test('route details can be expanded without exposing raw coordinates as street names', async () => {
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(
      <ThemeProvider>
        <TripRoute
          origin="25.6640, -100.2432"
          destination="Av. Eloy Cavazos 7750, Guadalupe, N.L., México"
          expandable
        />
      </ThemeProvider>,
    );
  });
  expect(JSON.stringify(tree.toJSON())).not.toContain('25.6640');
  const action = tree.root.findByType(Button);
  expect(action.props.accessibilityState.expanded).toBe(false);
  await act(() => action.props.onPress());
  expect(tree.root.findByType(Button).props.accessibilityState.expanded).toBe(
    true,
  );
  expect(JSON.stringify(tree.toJSON())).toContain('Guadalupe, N.L., México');
  await act(() => tree.unmount());
});
test('cancellation and completion have distinct semantic states', async () => {
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(
      <ThemeProvider>
        <TripStatus status="cancelled" />
        <TripStatus status="completed" />
      </ThemeProvider>,
    );
  });
  expect(
    tree.root.findAllByType(StatusBadge).map(node => node.props.tone),
  ).toEqual(['neutral', 'success']);
  await act(() => tree.unmount());
});
