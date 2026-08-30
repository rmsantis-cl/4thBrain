const fs = require("fs");
const path = require("path");
const { defineConfig, devices } = require("@playwright/test");

const ROOT = __dirname;
const SERVER_DIR = path.join(ROOT, "server");
const TMP_ROOT = path.join(ROOT, "tests", "ui", ".tmp");

// Wipe and recreate the isolated fixture area on every config load (every run
// starts clean; nothing here ever touches the real vault_dir/raw_dir/db).
try {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
} catch (err) {
  // SQLite database might still be locked — just continue; the next run will clean it
  if (err.code !== "EBUSY") throw err;
}
fs.mkdirSync(path.join(TMP_ROOT, "vault"), { recursive: true });
fs.mkdirSync(path.join(TMP_ROOT, "raw"), { recursive: true });

const baseParams = JSON.parse(fs.readFileSync(path.join(ROOT, "params.json"), "utf-8"));
const testParams = {
  ...baseParams,
  vault_dir: path.join(TMP_ROOT, "vault"),
  raw_dir: path.join(TMP_ROOT, "raw"),
  server_bind_host: "127.0.0.1",
};
const testParamsPath = path.join(TMP_ROOT, "params.test.json");
fs.writeFileSync(testParamsPath, JSON.stringify(testParams, null, 2));

const DEV_PORT = 3100;

module.exports = defineConfig({
  testDir: "./tests/ui",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: `http://127.0.0.1:${DEV_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-360", use: { viewport: { width: 360, height: 740 } } },
  ],
  webServer: {
    command: "node index.js",
    cwd: SERVER_DIR,
    url: `http://127.0.0.1:${DEV_PORT}/chat`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      NODE_ENV: "development",
      FOURTHBRAIN_TEST_HARNESS: "1",
      FOURTHBRAIN_PARAMS_FILE: testParamsPath,
      FOURTHBRAIN_DB_PATH: path.join(TMP_ROOT, "4thbrain-metadata-e2e.db"),
      FOURTHBRAIN_PORT_OVERRIDE: String(DEV_PORT),
    },
  },
  globalSetup: require.resolve("./tests/ui/global-setup.js"),
});
