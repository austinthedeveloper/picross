import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // No DOM: everything here runs in Node.
    environment: 'node',
    exclude: ['**/node_modules/**'],
  },
});
