import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import { AnimatedPressable } from '../src/shared/components/ui-v2/AnimatedPressable';
import { ThemeProvider } from '../src/shared/theme/ThemeProvider';

describe('AnimatedPressable', () => {
  it('preserves press behavior and accessibility state', async () => {
    const onPress = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ThemeProvider>
          <AnimatedPressable accessibilityLabel="Acción" onPress={onPress}>
            <Text>Acción</Text>
          </AnimatedPressable>
        </ThemeProvider>,
      );
    });
    const target = renderer!.root.findAll(node => node.props.accessibilityLabel === 'Acción')[0];
    await ReactTestRenderer.act(() => target.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
    const accessibleTarget = renderer!.root.findAll(node => node.props.accessibilityRole === 'button')[0];
    expect(accessibleTarget.props.accessibilityState.disabled).toBe(false);
  });

  it('exposes the disabled state', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ThemeProvider>
          <AnimatedPressable accessibilityLabel="Deshabilitado" disabled>
            <Text>Deshabilitado</Text>
          </AnimatedPressable>
        </ThemeProvider>,
      );
    });
    const target = renderer!.root.findAll(node => node.props.accessibilityRole === 'button')[0];
    expect(target.props.disabled).toBe(true);
    expect(target.props.accessibilityState.disabled).toBe(true);
  });
});
