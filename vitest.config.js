import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./test/setup/globalSetup.js'],
    setupFiles: ['./test/setup/testSetup.js'],
    testTimeout: 60000, // 60 seconds for contract deployments
    hookTimeout: 120000, // 2 minutes for global setup
    environment: 'node',
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Use single fork to share deployed contracts
      },
    },
  },
});