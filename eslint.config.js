import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['**/dist/**', '**/dist-tsc/**', '**/coverage/**']),
  // No inline `eslint-disable`: every exception lives here, scoped and explained.
  { linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'error' } },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          // Root-level config and script files sit outside the package tsconfigs.
          allowDefaultProject: [
            'eslint.config.js',
            'vitest.config.ts',
            'packages/client/vite.config.ts',
          ],
        },
      },
    },
    rules: {
      // Small modules with one concern each. Enforced, not aspired to.
      'max-lines': ['error', { max: 110, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 30, skipBlankLines: true, skipComments: true }],
      complexity: ['error', 8],
      'max-depth': ['error', 3],
      'max-params': ['error', 3],
      'no-warning-comments': ['error', { terms: ['todo', 'fixme', 'xxx', 'hack'] }],
      eqeqeq: ['error', 'always'],
      'no-console': 'error',
      // Express identifies an error handler by its 4-argument shape, so unused
      // trailing parameters are load-bearing.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Accessibility rules are errors, not warnings: a warning is a rule nobody fixes.
    files: ['packages/client/src/**/*.tsx'],
    extends: [jsxA11y.flatConfigs.strict, reactHooks.configs.flat['recommended-latest']],
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Production code proves types instead of asserting them: narrowing, Zod,
    // or a typed declaration. Only `as const` remains, which asserts nothing.
    files: ['packages/*/src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', '**/*.fixtures.{ts,tsx}', '**/test-utils/**'],
    rules: {
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
    },
  },
  {
    // Express recognises an error handler by its four parameters, so the one
    // error handler may take four; every other function stays at three.
    files: ['packages/server/src/routes/errors.ts'],
    rules: { 'max-params': ['error', 4] },
  },
  {
    // The structured logger is the one module that writes to stdio.
    files: ['packages/server/src/logging/log.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    // jsx-a11y ships no type declarations, so reading its config is untyped.
    files: ['eslint.config.js'],
    rules: { '@typescript-eslint/no-unsafe-member-access': 'off' },
  },
  {
    // Plain-JavaScript tooling scripts: no types to check, Node globals, console output is the point.
    files: ['scripts/**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: { Buffer: 'readonly', console: 'readonly', fetch: 'readonly', process: 'readonly' },
    },
    rules: { 'no-console': 'off' },
  },
  {
    // The push service worker is served as is, outside the bundle: plain JavaScript in a worker.
    files: ['packages/client/public/**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: { self: 'readonly', URL: 'readonly' },
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.fixtures.ts', '**/*.fixtures.tsx'],
    rules: {
      // supertest types `response.body` as `any` by design; asserting on it is
      // the point of an HTTP test.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
]);
