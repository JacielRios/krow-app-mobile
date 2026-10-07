import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { PlacePicker } from '../src/features/maps/components/PlacePicker';
import { Input } from '../src/shared/components/ui/Input';
import {
  AnimatedModal,
  AnimatedPressable,
  Button,
} from '../src/shared/components/ui-v2';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';
import {
  getPlaceDetails,
  searchPlaces,
} from '../src/features/maps/api/mapsApi';

jest.mock('../src/features/maps/api/mapsApi', () => ({
  searchPlaces: jest.fn(),
  getPlaceDetails: jest.fn(),
  reverseGeocode: jest.fn(),
  generateSessionToken: jest.fn(() => 'session'),
}));
jest.mock('../src/features/maps/components/RoutePreviewMap', () => ({
  RoutePreviewMap: () => null,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 24, left: 0 }),
}));

let tree: Renderer.ReactTestRenderer;
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(async () => {
  if (tree) await act(() => tree.unmount());
  jest.useRealTimers();
});

const button = (title: string) =>
  tree.root.findAllByType(Button).find(node => node.props.title === title)!;

async function openSearch(onChange = jest.fn()) {
  await act(() => {
    tree = Renderer.create(
      <ThemeProvider>
        <PlacePicker label="Destino" value={null} onChange={onChange} />
      </ThemeProvider>,
    );
  });
  await act(() =>
    tree.root.findAllByType(AnimatedPressable)[0].props.onPress(),
  );
  await act(() => button('Buscar lugar').props.onPress());
}

test.each(['android', 'ios'] as const)(
  '%s keeps search outside the results scroller and selects a result with the keyboard open',
  async platform => {
    const previousOS = Platform.OS;
    Platform.OS = platform;
    const dismiss = jest.spyOn(Keyboard, 'dismiss');
    const onChange = jest.fn();
    const results = Array.from({ length: 5 }, (_, index) => ({
      placeId: `place-${index}`,
      description: `Lugar ${index}, Guadalupe`,
      mainText: `Lugar ${index}`,
      secondaryText: 'Guadalupe, Nuevo León',
    }));
    (searchPlaces as jest.Mock).mockResolvedValue(results);
    (getPlaceDetails as jest.Mock).mockResolvedValue({
      placeId: 'place-4',
      formattedAddress: results[4].description,
      location: { lat: 25.65, lng: -100.19 },
    });
    try {
      await openSearch(onChange);
      expect(tree.root.findByType(KeyboardAvoidingView).props.behavior).toBe(
        'padding',
      );
      expect(tree.root.findByType(Input).props.autoFocus).toBe(true);
      // An unusable confirmation does not take space from the keyboard viewport.
      expect(button('Usar este punto')).toBeUndefined();
      await act(() =>
        tree.root.findByType(Input).props.onChangeText('Guadalupe'),
      );
      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });
      const scroller = tree.root.findByType(ScrollView);
      expect(scroller.findAllByType(Input)).toHaveLength(0);
      expect(scroller.props.keyboardShouldPersistTaps).toBe('always');
      expect(scroller.props.keyboardDismissMode).toBe('none');
      dismiss.mockClear();
      const last = scroller.findAll(
        node =>
          node.props.accessibilityLabel === results[4].description &&
          typeof node.props.onPress === 'function',
      )[0];
      await act(async () => last.props.onPress());
      expect(getPlaceDetails).toHaveBeenCalledWith(
        'place-4',
        expect.any(Object),
      );
      expect(tree.root.findByType(Input).props.value).toBe(
        results[4].description,
      );
      expect(dismiss).toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
      await act(() => button('Usar este punto').props.onPress());
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ placeId: 'place-4' }),
      );
      expect(tree.root.findAllByType(AnimatedModal)).toHaveLength(0);
    } finally {
      Platform.OS = previousOS;
      dismiss.mockRestore();
    }
  },
);

test('closing the picker cancels place details and discards their late response', async () => {
  let resolve!: (value: unknown) => void;
  (searchPlaces as jest.Mock).mockResolvedValue([
    { placeId: 'place', description: 'Guadalupe', mainText: 'Guadalupe' },
  ]);
  (getPlaceDetails as jest.Mock).mockReturnValue(
    new Promise(done => {
      resolve = done;
    }),
  );
  const onChange = jest.fn();
  await openSearch(onChange);
  await act(() => tree.root.findByType(Input).props.onChangeText('Guadalupe'));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(300);
  });
  await act(() => {
    void tree.root
      .findAll(
        node =>
          node.props.accessibilityLabel === 'Guadalupe' &&
          typeof node.props.onPress === 'function',
      )[0]
      .props.onPress();
  });
  const signal = (getPlaceDetails as jest.Mock).mock.calls[0][1].signal;
  await act(() => button('Cerrar').props.onPress());
  expect(signal.aborted).toBe(true);
  await act(async () =>
    resolve({
      placeId: 'place',
      formattedAddress: 'Guadalupe',
      location: { lat: 25.65, lng: -100.19 },
    }),
  );
  expect(onChange).not.toHaveBeenCalled();
  expect(tree.root.findAllByType(AnimatedModal)).toHaveLength(0);
});
