module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  resolver: '<rootDir>/node_modules/react-native-worklets/jest/resolver.js',
  transformIgnorePatterns: [
    'node_modules/(?!((@)?react-native|@react-navigation|react-native-reanimated|react-native-worklets|react-native-vector-icons)/)',
  ],
};
