module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['.'],
        alias: {
          '@': './src',
          '@app': './src/app',
          '@shared': './src/shared',
          '@services': './src/services',
          '@features': './src/features',
        },
      },
    ],
  ],
};
