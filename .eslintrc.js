module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      files: ['src/**/*.{ts,tsx}'],
      excludedFiles: ['src/core/auth/supabaseAuthClient.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: '@supabase/supabase-js',
                message:
                  'Supabase solo puede importarse desde el adaptador de Auth. Usa KROW API para datos de negocio.',
              },
            ],
          },
        ],
      },
    },
  ],
};
