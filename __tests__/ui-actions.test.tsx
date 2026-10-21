import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import {
  ActivityIndicator,
  Appearance,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';
import { IconButton } from '../src/shared/components/ui-v2/IconButton';
import { AnimatedPressable } from '../src/shared/components/ui-v2/AnimatedPressable';
import { Button } from '../src/shared/components/ui-v2/Button';
import { StarRating } from '../src/shared/components/ui/StarRating';
import { darkTheme, lightTheme } from '../src/shared/theme/themes';

const trees: Renderer.ReactTestRenderer[] = [];
async function render(children: React.ReactNode) {
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<ThemeProvider>{children}</ThemeProvider>);
  });
  trees.push(tree);
  return tree;
}
afterEach(async () => {
  for (const tree of trees.splice(0)) await act(() => tree.unmount());
  jest.restoreAllMocks();
});

test.each(['light', 'dark'] as const)(
  'icon actions preserve their label and selected state in %s mode',
  async scheme => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue(scheme);
    const onPress = jest.fn();
    const tree = await render(
      <IconButton
        iconName="gps-fixed"
        variant="tonal"
        selected
        accessibilityLabel="Seguir vehículo"
        onPress={onPress}
      />,
    );
    const control = tree.root.findByType(AnimatedPressable);
    expect(control.props.accessibilityLabel).toBe('Seguir vehículo');
    expect(control.props.accessibilityState).toMatchObject({
      selected: true,
      disabled: false,
      busy: false,
    });
    await act(() => control.props.onPress!({} as never));
    expect(onPress).toHaveBeenCalledTimes(1);
    const content = StyleSheet.flatten(control.props.contentStyle);
    expect(content.width).toBeGreaterThanOrEqual(48);
    expect(content.height).toBeGreaterThanOrEqual(48);
    expect(content.backgroundColor).toBe(
      (scheme === 'dark' ? darkTheme : lightTheme).colors.primarySoft,
    );
  },
);

test('sending an icon action exposes busy and disables the native press target until completion', async () => {
  const action = (loading: boolean) => (
    <ThemeProvider>
      <IconButton
        iconName="send"
        variant="filled"
        accessibilityLabel="Enviar mensaje"
        loading={loading}
      />
    </ThemeProvider>
  );
  const tree = await render(
    <IconButton
      iconName="send"
      variant="filled"
      accessibilityLabel="Enviar mensaje"
      loading
    />,
  );
  let target = tree.root.findByType(AnimatedPressable);
  expect(target.props.disabled).toBe(true);
  expect(target.props.accessibilityState?.busy).toBe(true);
  expect(tree.root.findAllByType(ActivityIndicator)).toHaveLength(1);
  await act(() => tree.update(action(false)));
  target = tree.root.findByType(AnimatedPressable);
  expect(target.props.disabled).toBe(false);
  expect(target.props.accessibilityState?.busy).toBe(false);
  expect(tree.root.findAllByType(ActivityIndicator)).toHaveLength(0);
});

test('legacy icon content still renders through the shared action without changing its handler', async () => {
  const onPress = jest.fn();
  const tree = await render(
    <IconButton
      icon={<Text>Icono existente</Text>}
      accessibilityLabel="Abrir conversación"
      onPress={onPress}
    />,
  );
  expect(tree.root.findByType(Text).props.children).toBe('Icono existente');
  await act(() =>
    tree.root.findByType(AnimatedPressable).props.onPress!({} as never),
  );
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('a critical text action keeps its name while loading, with room for a wrapping label', async () => {
  const title = 'Publicar los viajes seleccionados';
  const tree = await render(
    <Button title={title} iconName="add-road" loading />,
  );
  const target = tree.root.findByType(AnimatedPressable);
  expect(target.props.accessibilityLabel).toBe(title);
  expect(target.props.accessibilityState).toMatchObject({
    busy: true,
    disabled: true,
  });
  expect(
    tree.root.findAllByType(Text).some(n => n.props.children === title),
  ).toBe(true);
  expect(StyleSheet.flatten(target.props.contentStyle).height).toBeUndefined();
});

test('rating offers one checked choice, and the historical rating is a single readable value', async () => {
  const onChange = jest.fn();
  const tree = await render(<StarRating value={3} onChange={onChange} />);
  const choices = tree.root.findAllByType(IconButton);
  expect(choices).toHaveLength(5);
  expect(choices.filter(c => c.props.accessibilityState?.checked)).toHaveLength(
    1,
  );
  await act(() => choices[4].props.onPress!({} as never));
  expect(onChange).toHaveBeenCalledWith(5);
  await act(() =>
    tree.update(
      <ThemeProvider>
        <StarRating value={4} readOnly />
      </ThemeProvider>,
    ),
  );
  expect(tree.root.findAllByType(IconButton)).toHaveLength(0);
  expect(
    tree.root
      .findAllByType(View)
      .some(n => n.props.accessibilityLabel === '4 de 5 estrellas'),
  ).toBe(true);
});
