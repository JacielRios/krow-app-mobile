import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Animated, Text } from 'react-native';
import { useModalPresence } from '../src/shared/components/ui-v2/useModalPresence';

let tree: Renderer.ReactTestRenderer;
let completions: {
  target: number;
  finish: (result: { finished: boolean }) => void;
}[];
function Probe({
  visible,
  motion = true,
}: {
  visible: boolean;
  motion?: boolean;
}) {
  const { presented } = useModalPresence(visible, motion);
  return <Text>{presented ? 'present' : 'absent'}</Text>;
}
beforeEach(() => {
  completions = [];
  jest.spyOn(Animated, 'timing').mockImplementation((_value, config) => ({
    start: callback => {
      if (callback)
        completions.push({ target: Number(config.toValue), finish: callback });
    },
    stop: jest.fn(),
    reset: jest.fn(),
  }));
});
afterEach(async () => {
  if (tree) await act(() => tree.unmount());
  jest.restoreAllMocks();
});
const state = () => tree.root.findByType(Text).props.children;

test('retains the dialog until its exit finishes', async () => {
  await act(() => {
    tree = Renderer.create(<Probe visible />);
  });
  await act(() => tree.update(<Probe visible={false} />));
  expect(state()).toBe('present');
  await act(() =>
    completions
      .filter(item => item.target === 0)
      .at(-1)!
      .finish({ finished: true }),
  );
  expect(state()).toBe('absent');
});

test('an old exit completion cannot dismiss a reopened dialog', async () => {
  await act(() => {
    tree = Renderer.create(<Probe visible />);
  });
  await act(() => tree.update(<Probe visible={false} />));
  const previousExit = completions.filter(item => item.target === 0).at(-1)!;
  await act(() => tree.update(<Probe visible />));
  await act(() => previousExit.finish({ finished: true }));
  expect(state()).toBe('present');
});

test('reduced motion closes immediately without scheduling animations', async () => {
  await act(() => {
    tree = Renderer.create(<Probe visible motion={false} />);
  });
  await act(() => tree.update(<Probe visible={false} motion={false} />));
  expect(state()).toBe('absent');
  expect(Animated.timing).not.toHaveBeenCalled();
});

test('a closed dialog does not start an invisible animation', async () => {
  await act(() => {
    tree = Renderer.create(<Probe visible={false} />);
  });
  expect(state()).toBe('absent');
  expect(Animated.timing).not.toHaveBeenCalled();
});
