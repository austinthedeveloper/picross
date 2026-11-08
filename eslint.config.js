import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dist-dev',
      'dist-script-review',
      'node_modules',
      '.claude',
      'playwright-report',
      'test-results',
      'cubed/dist',
      'cubed/playwright-report',
      'cubed/test-results',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
);
