const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './__tests__',
  testMatch: /e2e\.spec\.js/,
  globalSetup: require.resolve('./e2e-setup/global-setup.js'),
  globalTeardown: require.resolve('./e2e-setup/global-teardown.js'),
  webServer: {
    command: 'DOTENV_PATH=.env.e2e node server.js',
    port: 3000,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
});
