import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { useDirections } from '../src/features/maps/hooks/useDirections';
import { getDirections } from '../src/features/maps/api/mapsApi';

jest.mock('../src/features/maps/api/mapsApi', () => ({
  getDirections: jest.fn(),
}));
const origin = { lat: 25.68, lng: -100.31 };
let result: ReturnType<typeof useDirections>;
let tree: Renderer.ReactTestRenderer;
function Probe({
  destination,
  corridorId,
  transportStopIds,
}: {
  destination: typeof origin | null;
  corridorId?: string;
  transportStopIds?: string[];
}) {
  result = useDirections(origin, destination, { corridorId, transportStopIds });
  return null;
}
afterEach(async () => {
  await act(async () => tree.unmount());
  jest.resetAllMocks();
});

test('changing avenues invalidates a late preview for the previous avenue and sends explicit stops', async () => {
  let resolveOld!: (value: null) => void;
  jest
    .mocked(getDirections)
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveOld = resolve;
        }),
    )
    .mockRejectedValueOnce(new Error('Nueva avenida sin ruta'));
  await act(async () => {
    tree = Renderer.create(<Probe destination={origin} corridorId="one" />);
  });
  await act(async () =>
    tree.update(
      <Probe
        destination={origin}
        corridorId="two"
        transportStopIds={['chosen']}
      />,
    ),
  );
  expect(getDirections).toHaveBeenLastCalledWith(
    origin,
    origin,
    expect.objectContaining({
      corridorId: 'two',
      transportStopIds: ['chosen'],
    }),
  );
  await act(async () => resolveOld(null));
  expect(result.error).toBe('Nueva avenida sin ruta');
  expect(result.directions).toBeNull();
  expect(result.loading).toBe(false);
});
test('a failed route exposes its error and clearing the destination clears loading', async () => {
  jest
    .mocked(getDirections)
    .mockRejectedValue(new Error('No pudimos calcular la ruta'));
  await act(async () => {
    tree = Renderer.create(<Probe destination={{ lat: 25.7, lng: -100.3 }} />);
  });
  expect(result.error).toBe('No pudimos calcular la ruta');
  expect(result.loading).toBe(false);
  await act(async () => tree.update(<Probe destination={null} />));
  expect(result.error).toBeNull();
  expect(result.loading).toBe(false);
});
test('a late failure cannot replace the result for a newer destination', async () => {
  let rejectOld!: (error: Error) => void;
  jest
    .mocked(getDirections)
    .mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectOld = reject;
        }),
    )
    .mockResolvedValueOnce(null);
  await act(async () => {
    tree = Renderer.create(<Probe destination={{ lat: 25.7, lng: -100.3 }} />);
  });
  await act(async () =>
    tree.update(<Probe destination={{ lat: 25.8, lng: -100.2 }} />),
  );
  await act(async () => rejectOld(new Error('Old request failed')));
  expect(result.error).toBeNull();
  expect(result.loading).toBe(false);
});
