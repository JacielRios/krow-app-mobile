import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { AccessibilityInfo, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from '../src/shared/theme/ThemeProvider';

const Probe = () => {
  const { colorScheme, motionEnabled, preference, theme, setPreference } =
    useTheme();
  return (
    <Text
      onPress={() => setPreference('dark')}
    >{`${preference}:${colorScheme}:${motionEnabled}:${theme.colors.background}`}</Text>
  );
};

describe('ThemeProvider', () => {
  afterEach(() => jest.restoreAllMocks());
  it('provides semantic theme values', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
      );
    });
    expect(renderer!.root.findByType(Text).props.children).toContain('system:');
    await ReactTestRenderer.act(() => renderer!.unmount());
  });
  it('keeps a user theme choice when a slow preference restore finishes later', async () => {
    let restore!: (value: string) => void;
    jest.spyOn(AsyncStorage, 'getItem').mockReturnValueOnce(
      new Promise(resolve => {
        restore = resolve;
      }),
    );
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
      );
    });
    await ReactTestRenderer.act(() =>
      renderer.root.findByType(Text).props.onPress(),
    );
    await ReactTestRenderer.act(() => restore('light'));
    expect(renderer.root.findByType(Text).props.children).toContain(
      'dark:dark:',
    );
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@krow/theme', 'dark');
    await ReactTestRenderer.act(() => renderer.unmount());
  });
  it('keeps the latest reduced motion event instead of an older bootstrap response', async () => {
    let restore!: (value: boolean) => void;
    let change!: (value: boolean) => void;
    const remove = jest.fn();
    // Select the boolean event overload; Jest otherwise infers announcementFinished.
    const motionEvents: {
      addEventListener: (
        event: 'reduceMotionChanged',
        handler: (reduced: boolean) => void,
      ) => { remove: () => void };
    } = AccessibilityInfo;
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValueOnce(
      new Promise(resolve => {
        restore = resolve;
      }),
    );
    jest
      .spyOn(motionEvents, 'addEventListener')
      .mockImplementation((_event, handler) => {
        change = handler;
        return { remove };
      });
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
      );
    });
    await ReactTestRenderer.act(() => change(true));
    await ReactTestRenderer.act(() => restore(false));
    expect(renderer.root.findByType(Text).props.children).toContain(':false:');
    await ReactTestRenderer.act(() => renderer.unmount());
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
