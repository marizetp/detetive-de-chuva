import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // Os fixtures gravados da API são só para testes: nunca podem chegar à interface.
    files: ['src/**/*.{js,jsx}'],
    ignores: ['src/**/*.test.{js,jsx}', 'src/test/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/test/**', '**/fixtures/**'],
              message: 'Fixtures de teste não podem ser usados em código de produção.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['*.config.js'],
    languageOptions: { globals: globals.node },
  },
]);
