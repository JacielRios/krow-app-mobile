module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['.'],
        alias: {
          '@': './src',
          '@core': './src/core',
          '@features': './src/features',
        },
      },
    ],
  ],
};
