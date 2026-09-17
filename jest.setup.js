/* eslint-env jest */

jest.mock('react-native-reanimated', () => {
  const { Animated } = require('react-native');
  const builder = {
    duration: () => builder,
    delay: () => builder,
  };
  return {
    __esModule: true,
    default: Animated,
    FadeIn: builder,
    FadeOut: builder,
    FadeInDown: builder,
    LinearTransition: builder,
    SlideInDown: builder,
    SlideOutDown: builder,
    cancelAnimation: jest.fn(),
    useAnimatedStyle: callback => callback(),
    useSharedValue: value => ({ value }),
    withRepeat: value => value,
    withSpring: value => value,
    withTiming: value => value,
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-config', () => ({
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'test-key',
  GOOGLE_MAPS_API_KEY: 'test-key',
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const component = props => React.createElement(View, props, props.children);
  return {
    __esModule: true,
    default: component,
    Marker: component,
    Polyline: component,
    PROVIDER_GOOGLE: 'google',
  };
});

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: props => React.createElement(View, props),
  };
});
