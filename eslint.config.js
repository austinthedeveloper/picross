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
      'apps/*/dist',
      'apps/*/dist-script-review',
      'apps/*/playwright-report',
      'apps/*/test-results',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    // Both games import packages/shared, so it never imports from either of them
    // (packages/shared/src/imports.test.ts checks the same).
    files: ['packages/shared/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/apps/**', 'picross', 'picross-3d', '@picross/*'],
              message: 'packages/shared imports only its own files (with relative paths).',
            },
          ],
        },
      ],
    },
  },
  {
    // The 2D engine and pack never touch the page or an app (packages/grid/src/imports.test.ts).
    files: ['packages/grid/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/apps/**', 'picross', 'picross-3d'],
              message: 'packages/grid never imports from an app.',
            },
            {
              regex: '^@picross/(?!shared/)',
              message: 'packages/grid imports its own files (relative) and @picross/shared only.',
            },
            {
              regex: '^@picross/shared/(ui|styles)/',
              message: 'packages/grid never touches the page: no @picross/shared/ui or styles.',
            },
          ],
        },
      ],
    },
  },
  {
    // The 2D play screen never imports from an app (packages/play-grid/src/imports.test.ts).
    files: ['packages/play-grid/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/apps/**', 'picross', 'picross-3d'],
              message: 'packages/play-grid never imports from an app; pass it in a PlaySession.',
            },
            {
              regex: '^@picross/(?!(grid|shared)/)',
              message:
                'packages/play-grid imports its own files, @picross/grid and @picross/shared.',
            },
          ],
        },
      ],
    },
  },
);
