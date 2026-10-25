const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/game.spec.cjs',
  fullyParallel: true,
  workers: 2,
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:8000',
    headless: true,
    reducedMotion: 'reduce',
    viewport: { width: 1440, height: 1100 },
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox']
    }
  },
  webServer: {
    command: 'python3 -m http.server 8000 --bind 0.0.0.0',
    url: 'http://127.0.0.1:8000',
    reuseExistingServer: true
  }
});
