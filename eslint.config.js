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
    // Both games and every package import packages/shared, so it never imports from any of
    // them, the story included (packages/shared/src/imports.test.ts checks the same).
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
    // The story is read by both games and the board packages (grid, block, play-block), so
    // it never imports from any of them; its data and loaders (outside ui/) never touch the
    // page. Its tests may use @picross/block, for the gate (packages/story/src/imports.test.ts).
    files: ['packages/story/**'],
    ignores: ['packages/story/src/ui/**', 'packages/story/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/apps/**', 'picross', 'picross-3d'],
              message: 'packages/story never imports from an app.',
            },
            {
              regex: '^@picross/(?!shared/)',
              message: 'packages/story imports its own files and @picross/shared only.',
            },
            {
              regex: '^@picross/shared/(ui|styles)/',
              message: "The story's data and loaders never touch the page: no @picross/shared/ui.",
            },
            {
              group: ['**/ui/**'],
              message: "The story's data and loaders never import its scene player (src/ui/).",
            },
          ],
        },
      ],
    },
  },
  {
    // The story's scene player (src/ui/) draws with shared's ui/.
    files: ['packages/story/src/ui/**'],
    ignores: ['packages/story/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/apps/**', 'picross', 'picross-3d'],
              message: 'packages/story never imports from an app.',
            },
            {
              regex: '^@picross/(?!shared/)',
              message: 'packages/story imports its own files and @picross/shared only.',
            },
          ],
        },
      ],
    },
  },
  {
    // The story's tests may also use @picross/block (a dev dependency), for the gate.
    files: ['packages/story/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/apps/**', 'picross', 'picross-3d'],
              message: 'packages/story never imports from an app.',
            },
            {
              regex: '^@picross/(?!(shared|block)/)',
              message:
                "packages/story's tests import its own files, @picross/shared and @picross/block.",
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
              regex: '^@picross/(?!(shared|story)/)',
              message:
                'packages/grid imports its own files (relative), @picross/shared and @picross/story only.',
            },
            {
              regex: '^@picross/(shared|story)/(ui|styles)/',
              message:
                'packages/grid never touches the page: no ui or styles from shared or story.',
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
  {
    // packages/block is a block's rules and data, for both games: no app, no screen (so no
    // play-block or shared ui/) and no three.js (packages/block/src/imports.test.ts too).
    files: ['packages/block/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/apps/**',
                'picross',
                'picross-3d',
                '@picross/play-block',
                '@picross/play-block/**',
                '@picross/shared/ui/**',
                '@picross/shared/styles/**',
                '@picross/story/ui/**',
                'three',
                'three/**',
              ],
              message:
                'packages/block imports only its own files and the rules and data of @picross/shared and @picross/story.',
            },
          ],
        },
      ],
    },
  },
  {
    // packages/play-block draws a block for both games, so it never imports from either
    // (packages/play-block/src/imports.test.ts checks the same).
    files: ['packages/play-block/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/apps/**', 'picross', 'picross-3d'],
              message: 'packages/play-block imports only block, shared, story and three.js.',
            },
          ],
        },
      ],
    },
  },
  {
    // Neither game imports the other: what both use lives in packages/.
    files: ['apps/picross/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/cubed/**', 'picross-3d', 'picross-3d/**'],
              message: 'The 2D game never imports from apps/cubed: use a package.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportExpression > Literal[value=/(^|\\/)cubed\\//]',
          message: 'The 2D game never imports from apps/cubed: use a package.',
        },
      ],
    },
  },
  {
    files: ['apps/cubed/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/picross/**', 'picross', 'picross/**'],
              message: 'Cubed never imports from apps/picross: use a package.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportExpression > Literal[value=/(^|\\/)picross\\//]',
          message: 'Cubed never imports from apps/picross: use a package.',
        },
      ],
    },
  },
);
