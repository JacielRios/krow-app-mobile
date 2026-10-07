import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';
import { ValueSlider } from '../src/shared/components/ui-v2/ValueSlider';
import { SeatDial } from '../src/features/ride/components/SeatDial';
import { PlacePicker } from '../src/features/maps/components/PlacePicker';
import { RoutePreviewMap } from '../src/features/maps/components/RoutePreviewMap';
import { AnimatedPressable, Button } from '../src/shared/components/ui-v2';
import { reverseGeocode } from '../src/features/maps/api/mapsApi';
import DateTimePicker from '@react-native-community/datetimepicker';
import { PanResponder, Platform, TouchableOpacity } from 'react-native';
import { RideDateTimePicker } from '../src/features/ride/components/RideDateTimePicker';
import { RideComfortControls } from '../src/features/ride/components/RideComfortControls';
import { Input } from '../src/shared/components/ui-v2';

jest.mock('../src/features/maps/api/mapsApi', () => ({
  reverseGeocode: jest.fn(),
  decodePolyline: jest.fn(() => []),
}));
jest.mock('../src/features/maps/components/PlacesAutocompleteInput', () => ({
  PlacesAutocompleteInput: () => null,
}));
jest.mock('../src/features/maps/components/RoutePreviewMap', () => ({
  RoutePreviewMap: () => null,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const renders: Renderer.ReactTestRenderer[] = [];
async function render(child: React.ReactNode) {
  let result!: Renderer.ReactTestRenderer;
  await act(() => {
    result = Renderer.create(<ThemeProvider>{child}</ThemeProvider>);
  });
  renders.push(result);
  return result;
}
afterEach(async () => {
  for (const result of renders.splice(0)) await act(() => result.unmount());
  jest.clearAllMocks();
});

test('slider clamps screen-reader adjustments and blocks disabled changes', async () => {
  const onChange = jest.fn();
  const result = await render(
    <ValueSlider
      label="Precio"
      min={1}
      max={200}
      value={200}
      onChange={onChange}
    />,
  );
  const control = result.root.findAll(
    node => node.props.accessibilityRole === 'adjustable',
  )[0];
  await act(() =>
    control.props.onAccessibilityAction({
      nativeEvent: { actionName: 'increment' },
    }),
  );
  expect(onChange).toHaveBeenLastCalledWith(200);
  await act(() =>
    result.update(
      <ThemeProvider>
        <ValueSlider
          label="Precio"
          min={1}
          max={200}
          value={200}
          onChange={onChange}
          disabled
        />
      </ThemeProvider>,
    ),
  );
  await act(() =>
    result.root
      .findAll(node => node.props.accessibilityRole === 'adjustable')[0]
      .props.onAccessibilityAction({
        nativeEvent: { actionName: 'decrement' },
      }),
  );
  expect(onChange).toHaveBeenCalledTimes(1);
});

test('seat dial cannot exceed vehicle capacity or change without a vehicle', async () => {
  const onChange = jest.fn();
  const result = await render(
    <SeatDial value={3} max={3} onChange={onChange} />,
  );
  await act(() =>
    result.root
      .findAll(node => node.props.accessibilityRole === 'adjustable')[0]
      .props.onAccessibilityAction({
        nativeEvent: { actionName: 'increment' },
      }),
  );
  expect(onChange).toHaveBeenLastCalledWith(3);
  await act(() =>
    result.update(
      <ThemeProvider>
        <SeatDial value={null} max={0} onChange={onChange} />
      </ThemeProvider>,
    ),
  );
  await act(() =>
    result.root
      .findAll(node => node.props.accessibilityRole === 'adjustable')[0]
      .props.onAccessibilityAction({
        nativeEvent: { actionName: 'increment' },
      }),
  );
  expect(onChange).toHaveBeenCalledTimes(1);
});

test('only the latest dragged point can be confirmed after geocoding', async () => {
  const pending: Array<
    (value: { formattedAddress: string; placeId: string }) => void
  > = [];
  (reverseGeocode as jest.Mock).mockImplementation(
    () => new Promise(resolve => pending.push(resolve)),
  );
  const onChange = jest.fn();
  const result = await render(
    <PlacePicker label="Destino" value={null} onChange={onChange} />,
  );
  await act(() =>
    result.root.findAllByType(AnimatedPressable)[0].props.onPress(),
  );
  const pointA = { lat: 19.1, lng: -99.1 },
    pointB = { lat: 19.2, lng: -99.2 };
  await act(() =>
    result.root.findByType(RoutePreviewMap).props.onMapPress(pointA),
  );
  await act(() =>
    result.root.findByType(RoutePreviewMap).props.onMapPress(pointB),
  );
  const confirm = () =>
    result.root
      .findAllByType(Button)
      .find(button => button.props.title === 'Usar este punto')!;
  expect(confirm().props.loading).toBe(true);
  await act(async () =>
    pending[1]({ formattedAddress: 'Segundo punto', placeId: 'b' }),
  );
  await act(async () =>
    pending[0]({ formattedAddress: 'Primer punto', placeId: 'a' }),
  );
  await act(() => confirm().props.onPress());
  expect(onChange).toHaveBeenCalledWith({
    address: 'Segundo punto',
    placeId: 'b',
    location: pointB,
  });
});

test('a failed map lookup cannot commit an unresolved location', async () => {
  (reverseGeocode as jest.Mock).mockRejectedValue(new Error('offline'));
  const onChange = jest.fn();
  const result = await render(
    <PlacePicker label="Destino" value={null} onChange={onChange} />,
  );
  await act(() =>
    result.root.findAllByType(AnimatedPressable)[0].props.onPress(),
  );
  await act(async () =>
    result.root
      .findByType(RoutePreviewMap)
      .props.onMapPress({ lat: 19, lng: -99 }),
  );
  const confirm = result.root
    .findAllByType(Button)
    .find(button => button.props.title === 'Usar este punto')!;
  expect(confirm.props.disabled).toBe(true);
  expect(onChange).not.toHaveBeenCalled();
});

test('dismissing the native date selector does not advance or commit a date', async () => {
  const previousOS = Platform.OS;
  Platform.OS = 'android';
  try {
    const onChange = jest.fn();
    const result = await render(
      <RideDateTimePicker value={null} onChange={onChange} />,
    );
    await act(() => result.root.findByType(TouchableOpacity).props.onPress());
    await act(() => result.root.findByType(DateTimePicker).props.onDismiss());
    expect(onChange).not.toHaveBeenCalled();
    expect(result.root.findAllByType(DateTimePicker)).toHaveLength(0);
  } finally {
    Platform.OS = previousOS;
  }
});

test('price shortcuts select an exact amount without changing the seat count', async () => {
  const onPriceChange = jest.fn(),
    onSeatsChange = jest.fn();
  const result = await render(
    <RideComfortControls
      seats="2"
      maxSeats={3}
      price=""
      onPriceChange={onPriceChange}
      onSeatsChange={onSeatsChange}
    />,
  );
  await act(() =>
    result.root
      .findAllByType(Button)
      .find(button => button.props.title === '$35')!
      .props.onPress(),
  );
  expect(onPriceChange).toHaveBeenCalledWith('35');
  expect(onSeatsChange).not.toHaveBeenCalled();
});

test('a favorite can retain an optional seat default without an assigned vehicle', async () => {
  const onSeatsChange = jest.fn();
  const result = await render(
    <RideComfortControls
      optional
      seats="2"
      maxSeats={0}
      price="35"
      onPriceChange={jest.fn()}
      onSeatsChange={onSeatsChange}
    />,
  );
  expect(result.root.findAllByType(SeatDial)).toHaveLength(0);
  const input = result.root
    .findAllByType(Input)
    .find(node => node.props.label === 'Cupo predeterminado (opcional)')!;
  expect(input.props.value).toBe('2');
  await act(() => input.props.onChangeText('3'));
  expect(onSeatsChange).toHaveBeenLastCalledWith('3');
  await act(() =>
    result.root
      .findAllByType(Button)
      .find(node => node.props.title === 'Sin cupo predeterminado')!
      .props.onPress(),
  );
  expect(onSeatsChange).toHaveBeenLastCalledWith('');
});

test('quick departures earlier than the allowed date are disabled instead of mislabeled', async () => {
  const result = await render(
    <RideDateTimePicker
      value={null}
      onChange={jest.fn()}
      minimumDate={new Date(Date.now() + 90 * 60000)}
    />,
  );
  const buttons = result.root.findAllByType(Button);
  expect(
    buttons.find(button => button.props.title === 'En 30 min')!.props.disabled,
  ).toBe(true);
  expect(
    buttons.find(button => button.props.title === 'En 1 hora')!.props.disabled,
  ).toBe(true);
  expect(
    buttons.find(button => button.props.title === 'En 2 horas')!.props.disabled,
  ).toBe(false);
});

test('slider yields vertical scrolling and keeps live limits during a horizontal drag', async () => {
  const spy = jest.spyOn(PanResponder, 'create');
  const onChange = jest.fn();
  let result!: Renderer.ReactTestRenderer;
  try {
    const control = (max: number, disabled = false) => (
      <ThemeProvider>
        <ValueSlider
          label="Monto"
          min={0}
          max={max}
          value={25}
          disabled={disabled}
          onChange={onChange}
        />
      </ThemeProvider>
    );
    await act(() => {
      result = Renderer.create(control(100), {
        createNodeMock: element =>
          (element.props as { accessibilityRole?: string })
            .accessibilityRole === 'adjustable'
            ? {
                measureInWindow: (callback: (x: number) => void) =>
                  callback(40),
              }
            : null,
      });
    });
    renders.push(result);
    const gestures = spy.mock.calls[0][0];
    const event = { nativeEvent: { pageX: 262 } } as any;
    const vertical = { dx: 2, dy: 35 } as any;
    const horizontal = { dx: 120, dy: 2 } as any;
    await act(() =>
      result.root
        .findAll(node => node.props.accessibilityRole === 'adjustable')[0]
        .props.onLayout({ nativeEvent: { layout: { width: 244 } } }),
    );
    await act(() => gestures.onPanResponderGrant!(event, vertical));
    await act(() => gestures.onPanResponderMove!(event, vertical));
    expect(onChange).not.toHaveBeenCalled();
    expect(gestures.onPanResponderTerminationRequest!(event, vertical)).toBe(
      true,
    );
    await act(() => gestures.onPanResponderMove!(event, horizontal));
    expect(onChange).toHaveBeenLastCalledWith(100);
    await act(() => result.update(control(50)));
    await act(() => gestures.onPanResponderMove!(event, horizontal));
    expect(onChange).toHaveBeenLastCalledWith(50);
    await act(() => result.update(control(50, true)));
    onChange.mockClear();
    await act(() => gestures.onPanResponderMove!(event, horizontal));
    expect(onChange).not.toHaveBeenCalled();
  } finally {
    spy.mockRestore();
  }
});
