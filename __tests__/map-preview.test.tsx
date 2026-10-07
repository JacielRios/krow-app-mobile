import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { RoutePreviewMap } from '../src/features/maps/components/RoutePreviewMap';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';
import { Button, IconButton } from '../src/shared/components/ui-v2';
import { decodePolyline } from '../src/features/maps/api/mapsApi';

const mockFit = jest.fn(),
  mockCamera = jest.fn();
jest.mock('../src/features/maps/api/mapsApi', () => ({
  ...jest.requireActual('../src/features/maps/api/mapsApi'),
  decodePolyline: jest.fn(() => []),
}));
jest.mock('react-native-maps', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    PROVIDER_GOOGLE: 'google',
    default: ReactModule.forwardRef((props: any, ref: any) => {
      ReactModule.useImperativeHandle(ref, () => ({
        fitToCoordinates: mockFit,
        animateCamera: mockCamera,
      }));
      return ReactModule.createElement(View, props, props.children);
    }),
    Marker: View,
    Polyline: View,
  };
});
let tree: Renderer.ReactTestRenderer;
const point = { lat: 25.68, lng: -100.31 };
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(async () => {
  await act(() => tree.unmount());
  jest.useRealTimers();
});
const map = () =>
  tree.root.findAll(node => typeof node.props.onMapLoaded === 'function')[0];
const retry = () =>
  tree.root
    .findAllByType(Button)
    .find(button => button.props.title === 'Reintentar mapa');
async function mount(interactive = true) {
  await act(() => {
    tree = Renderer.create(
      <ThemeProvider>
        <RoutePreviewMap
          origin={point}
          destination={null}
          interactive={interactive}
        />
      </ThemeProvider>,
    );
  });
  await layOutMap();
}
async function layOutMap(height = 400) {
  await act(() =>
    tree.root
      .findAll(node => typeof node.props.onLayout === 'function')[0]
      .props.onLayout({ nativeEvent: { layout: { width: 360, height } } }),
  );
}
test('a tile timeout offers retry and a subsequent successful load clears it', async () => {
  await mount();
  await act(() => jest.advanceTimersByTime(15000));
  expect(retry()).toBeDefined();
  await act(() => retry()!.props.onPress());
  expect(retry()).toBeUndefined();
  await act(() => map().props.onMapLoaded());
  await act(() => jest.advanceTimersByTime(15000));
  expect(retry()).toBeUndefined();
});
test('recenter is available after tiles load and frames the chosen point', async () => {
  await mount();
  expect(tree.root.findAllByType(IconButton)).toHaveLength(0);
  await act(() => map().props.onMapReady());
  await act(() => map().props.onMapLoaded());
  mockCamera.mockClear();
  await act(() => tree.root.findByType(IconButton).props.onPress());
  expect(mockCamera).toHaveBeenCalledWith(
    { center: { latitude: point.lat, longitude: point.lng } },
    expect.any(Object),
  );
});
test('a noninteractive map does not expose gestures or recenter controls', async () => {
  await mount(false);
  await act(() => map().props.onMapLoaded());
  expect(map().props.scrollEnabled).toBe(false);
  expect(map().props.zoomEnabled).toBe(false);
  expect(tree.root.findAllByType(IconButton)).toHaveLength(0);
});

test('a resolved route replaces the provisional line and is framed after the new map is ready', async () => {
  await mount();
  await act(() => map().props.onMapReady());
  await act(() => map().props.onMapLoaded());
  const coords = [
    { latitude: point.lat, longitude: point.lng },
    { latitude: 25.69, longitude: -100.3 },
    { latitude: 25.7, longitude: -100.29 },
  ];
  jest.mocked(decodePolyline).mockReturnValueOnce(coords);
  await act(() => {
    tree.update(
      <ThemeProvider>
        <RoutePreviewMap
          origin={point}
          destination={{ lat: 25.7, lng: -100.29 }}
          encodedPolyline="resolved-route"
          interactive
        />
      </ThemeProvider>,
    );
  });
  expect(tree.root.findAllByType(IconButton)).toHaveLength(0);
  const line = tree.root.findAll(node => node.props.coordinates === coords)[0];
  expect(line.props.lineDashPattern).toBeUndefined();
  await act(() => map().props.onMapReady());
  await act(() => map().props.onMapLoaded());
  expect(mockFit).toHaveBeenLastCalledWith(coords, expect.any(Object));
  expect(tree.root.findAllByType(IconButton)).toHaveLength(1);
});

test('tracking keeps its map and moves the camera only for new live coordinates', async () => {
  const render = (lat: number, stale = false, polyline = 'route') => (
    <ThemeProvider>
      <RoutePreviewMap
        origin={point}
        destination={null}
        trackingMode
        interactive
        encodedPolyline={polyline}
        vehicle={{ point: { lat, lng: point.lng }, stale }}
      />
    </ThemeProvider>
  );
  await act(() => {
    tree = Renderer.create(render(point.lat));
  });
  await layOutMap();
  await act(() => map().props.onMapReady());
  await act(() => map().props.onMapLoaded());
  mockCamera.mockClear();
  await act(() => tree.update(render(point.lat)));
  expect(mockCamera).not.toHaveBeenCalled();
  await act(() => tree.update(render(point.lat + 0.001, false, 'new-route')));
  expect(mockCamera).toHaveBeenCalledTimes(1);
  expect(tree.root.findAllByType(IconButton)).toHaveLength(1);
  mockCamera.mockClear();
  await act(() => tree.update(render(point.lat + 0.002, true)));
  expect(mockCamera).not.toHaveBeenCalled();
});

test('does not fit native bounds until layout and map loading both finish', async () => {
  await act(() => {
    tree = Renderer.create(
      <ThemeProvider>
        <RoutePreviewMap
          origin={point}
          destination={{ lat: 25.7, lng: -100.29 }}
          interactive
        />
      </ThemeProvider>,
    );
  });
  await act(() => map().props.onMapReady());
  expect(mockFit).not.toHaveBeenCalled();
  await act(() => map().props.onMapLoaded());
  expect(mockFit).not.toHaveBeenCalled();
  await layOutMap();
  expect(mockFit).toHaveBeenCalledTimes(1);
});

test('invalid GPS and stop coordinates never reach the native canvas or camera', async () => {
  await act(() => {
    tree = Renderer.create(
      <ThemeProvider>
        <RoutePreviewMap
          origin={{ lat: NaN, lng: -100 }}
          destination={{ lat: 25, lng: Infinity }}
          extraMarkers={[
            { id: 'invalid', point: { lat: 100, lng: -100 } },
            { id: 'valid', point },
          ]}
          vehicle={{ point: { lat: 25, lng: NaN }, stale: false, heading: NaN }}
          interactive
        />
      </ThemeProvider>,
    );
  });
  await layOutMap();
  await act(() => map().props.onMapReady());
  await act(() => map().props.onMapLoaded());
  const markers = tree.root.findAll(node => node.props.coordinate);
  expect(markers.length).toBeGreaterThan(0);
  expect(
    markers.every(
      node =>
        Number.isFinite(node.props.coordinate.latitude) &&
        Number.isFinite(node.props.coordinate.longitude),
    ),
  ).toBe(true);
  expect(mockFit).not.toHaveBeenCalled();
  expect(mockCamera).toHaveBeenCalledWith(
    { center: { latitude: point.lat, longitude: point.lng } },
    expect.any(Object),
  );
});

test('a detached native camera command shows retry instead of escaping its effect', async () => {
  mockCamera.mockImplementationOnce(() => {
    throw new Error('detached map');
  });
  await mount();
  await act(() => map().props.onMapReady());
  await act(() => map().props.onMapLoaded());
  expect(retry()).toBeDefined();
});

test('oversized tracking panel padding preserves visible map space', async () => {
  await act(() => {
    tree = Renderer.create(
      <ThemeProvider>
        <RoutePreviewMap
          origin={point}
          destination={null}
          viewportInsets={{ top: 100, bottom: 900 }}
          trackingMode
        />
      </ThemeProvider>,
    );
  });
  await layOutMap(300);
  const padding = map().props.mapPadding;
  expect(padding.top + padding.bottom).toBeLessThanOrEqual(300 - 144);
});

test('waiting for GPS does not repeatedly fit the same route on each snapshot', async () => {
  const render = () => (
    <ThemeProvider>
      <RoutePreviewMap
        origin={point}
        destination={{ lat: 25.7, lng: -100.29 }}
        extraMarkers={[{ id: 'stop', point: { lat: 25.69, lng: -100.3 } }]}
        trackingMode
      />
    </ThemeProvider>
  );
  await act(() => {
    tree = Renderer.create(render());
  });
  await layOutMap();
  await act(() => map().props.onMapReady());
  await act(() => map().props.onMapLoaded());
  expect(mockFit).toHaveBeenCalledTimes(1);
  await act(() => tree.update(render()));
  await act(() => tree.update(render()));
  expect(mockFit).toHaveBeenCalledTimes(1);
});
