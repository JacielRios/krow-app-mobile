import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import {
  usePlacesAutocomplete,
  UsePlacesAutocompleteResult,
} from '../src/features/maps/hooks/usePlacesAutocomplete';
import {
  searchPlaces,
  getPlaceDetails,
} from '../src/features/maps/api/mapsApi';
import { PlacesAutocompleteInput } from '../src/features/maps/components/PlacesAutocompleteInput';
import { Input } from '../src/shared/components/ui/Input';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';

jest.mock('../src/features/maps/api/mapsApi', () => ({
  searchPlaces: jest.fn(),
  getPlaceDetails: jest.fn(),
  generateSessionToken: jest.fn(() => 'session'),
}));

let state: UsePlacesAutocompleteResult;
function Harness({ enabled = true }: { enabled?: boolean }) {
  state = usePlacesAutocomplete({ enabled });
  return null;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
let tree: Renderer.ReactTestRenderer;
const suggestion = {
  placeId: 'place',
  description: 'Monterrey',
  mainText: 'Monterrey',
  secondaryText: 'Nuevo León',
};
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(async () => {
  if (tree) await act(() => tree.unmount());
  jest.useRealTimers();
});
async function mount(child: React.ReactElement = <Harness />) {
  await act(() => {
    tree = Renderer.create(child);
  });
}
async function search(query: string) {
  await act(() => state.setQuery(query));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(300);
  });
}

test('clearing a query cancels it and discards a late response', async () => {
  const pending = deferred<(typeof suggestion)[]>();
  (searchPlaces as jest.Mock).mockReturnValue(pending.promise);
  await mount();
  await search('Monterrey');
  const signal = (searchPlaces as jest.Mock).mock.calls[0][1].signal;
  await act(() => state.reset());
  expect(signal.aborted).toBe(true);
  await act(async () => pending.resolve([suggestion]));
  expect(state.suggestions).toEqual([]);
  expect(state.loading).toBe(false);
});

test('the newest query wins even when the server ignores cancellation', async () => {
  const first = deferred<(typeof suggestion)[]>(),
    second = deferred<(typeof suggestion)[]>();
  (searchPlaces as jest.Mock)
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  await mount();
  await search('Monterrey');
  await search('Guadalupe');
  await act(async () =>
    second.resolve([{ ...suggestion, mainText: 'Guadalupe' }]),
  );
  await act(async () => first.resolve([suggestion]));
  expect(state.suggestions[0].mainText).toBe('Guadalupe');
});

test('disabling and unmounting abort requests without displaying cancellation errors', async () => {
  const first = deferred<(typeof suggestion)[]>(),
    second = deferred<(typeof suggestion)[]>();
  (searchPlaces as jest.Mock)
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  await mount();
  await search('Monterrey');
  const firstSignal = (searchPlaces as jest.Mock).mock.calls[0][1].signal;
  await act(() => tree.update(<Harness enabled={false} />));
  expect(firstSignal.aborted).toBe(true);
  await act(async () => first.reject(new Error('aborted')));
  expect(state.error).toBeNull();
  expect(state.loading).toBe(false);
  await act(() => tree.update(<Harness />));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(300);
  });
  const secondSignal = (searchPlaces as jest.Mock).mock.calls[1][1].signal;
  await act(() => tree.unmount());
  expect(secondSignal.aborted).toBe(true);
  await act(async () => second.resolve([suggestion]));
});

test('failed searches can retry the same text successfully', async () => {
  (searchPlaces as jest.Mock)
    .mockRejectedValueOnce(new Error('Sin conexión'))
    .mockResolvedValueOnce([suggestion]);
  await mount();
  await search('Monterrey');
  expect(state.error).toBe('Sin conexión');
  await act(() => state.retry());
  await act(async () => {
    await jest.advanceTimersByTimeAsync(300);
  });
  expect(state.error).toBeNull();
  expect(state.suggestions).toEqual([suggestion]);
});

async function showSuggestions(onChange: jest.Mock) {
  (searchPlaces as jest.Mock).mockResolvedValue([suggestion]);
  await mount(
    <ThemeProvider>
      <PlacesAutocompleteInput value={null} onChange={onChange} />
    </ThemeProvider>,
  );
  await act(() => tree.root.findByType(Input).props.onFocus());
  await act(() => tree.root.findByType(Input).props.onChangeText('Monterrey'));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(300);
  });
}
const select = () =>
  tree.root.findAll(
    node =>
      node.props.accessibilityLabel === suggestion.description &&
      typeof node.props.onPress === 'function',
  )[0];

test('editing while details load prevents the old place from being selected', async () => {
  const pending = deferred<unknown>();
  (getPlaceDetails as jest.Mock).mockReturnValue(pending.promise);
  const onChange = jest.fn();
  await showSuggestions(onChange);
  await act(() => {
    void select().props.onPress();
  });
  await act(() => tree.root.findByType(Input).props.onChangeText('Guadalupe'));
  expect((getPlaceDetails as jest.Mock).mock.calls[0][1].signal.aborted).toBe(
    true,
  );
  await act(async () =>
    pending.resolve({
      placeId: 'place',
      formattedAddress: 'Monterrey',
      location: { lat: 25, lng: -100 },
    }),
  );
  expect(onChange).not.toHaveBeenCalled();
});

test('details failure is visible and selecting the result again recovers', async () => {
  (getPlaceDetails as jest.Mock)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({
      placeId: 'place',
      formattedAddress: 'Monterrey',
      location: { lat: 25, lng: -100 },
    });
  const onChange = jest.fn();
  await showSuggestions(onChange);
  await act(async () => select().props.onPress());
  expect(tree.root.findByType(Input).props.error).toContain('reintentar');
  await act(async () => select().props.onPress());
  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({ address: 'Monterrey' }),
  );
});

test('suggestions remain selectable after keyboard blur', async () => {
  const onChange = jest.fn();
  (getPlaceDetails as jest.Mock).mockResolvedValue({
    placeId: 'place',
    formattedAddress: 'Monterrey',
    location: { lat: 25, lng: -100 },
  });
  await showSuggestions(onChange);
  await act(() => tree.root.findByType(Input).props.onBlur());
  await act(async () => {
    await jest.advanceTimersByTimeAsync(500);
  });
  await act(async () => select().props.onPress());
  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({ address: 'Monterrey' }),
  );
});
