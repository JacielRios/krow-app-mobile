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
                name: 'react-native',
                importNames: ['Alert'],
                message:
                  'Utiliza KrowAlert de shared/components/ui-v2/dialogService para mantener los diálogos de KROW consistentes.',
              },
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
