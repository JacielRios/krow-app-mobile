import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import { ThemeProvider, useTheme } from '../src/shared/theme/ThemeProvider';

const Probe = () => {
  const { colorScheme, motionEnabled, preference, theme } = useTheme();
  return <Text>{`${preference}:${colorScheme}:${motionEnabled}:${theme.colors.background}`}</Text>;
};

describe('ThemeProvider', () => {
  it('provides semantic theme values', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<ThemeProvider><Probe /></ThemeProvider>);
    });
    expect(renderer!.root.findByType(Text).props.children).toContain('system:');
  });
});
