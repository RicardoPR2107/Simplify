// Configuración de ESLint (análisis estático) para todo el monorepo.
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/src/generated/**',
      '**/playwright-report/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'warn',
    },
  },
  {
    files: ['apps/api/**/*.ts', 'packages/shared/**/*.ts', '*.js'],
    languageOptions: { globals: globals.node },
  },
  {
    // Scripts de infraestructura que se ejecutan con Node (por ejemplo, dentro de Docker).
    files: ['infra/**/*.mjs'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },
  {
    // Archivos que el navegador carga tal cual, sin pasar por Vite.
    files: ['apps/web/public/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    // Pruebas de carga: k6 define sus propias variables globales.
    files: ['load-tests/**/*.js'],
    languageOptions: { globals: { __ENV: 'readonly', __VU: 'readonly', __ITER: 'readonly' } },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
);
