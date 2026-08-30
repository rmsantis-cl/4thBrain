const { test, expect, spawn } = require("@playwright/test");
const { spawn: spawnNode } = require("child_process");
const path = require("path");
const fs = require("fs");
const net = require("net");

const PROD_PORT = 3200;
const SERVER_DIR = path.join(__dirname, "..", "..", "server");
const TMP_ROOT = path.join(__dirname, "..", ".tmp");

async function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port, "127.0.0.1");
  });
}

async function waitForServer(port, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/chat`);
      if (response.ok || response.status === 403) {
        return true;
      }
    } catch (e) {
      // Connection not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

test.describe("Dev-only route gating", () => {
  let serverProcess;

  test.beforeAll(async () => {
    // Ensure port is available
    const available = await checkPortAvailable(PROD_PORT);
    if (!available) {
      throw new Error(`Port ${PROD_PORT} is already in use`);
    }

    // Create test params file for isolated server
    const testParams = JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", "..", "params.json"), "utf-8")
    );
    testParams.vault_dir = path.join(TMP_ROOT, "vault-prod");
    testParams.raw_dir = path.join(TMP_ROOT, "raw-prod");
    testParams.server_bind_host = "127.0.0.1";

    const testParamsPath = path.join(TMP_ROOT, "params-prod.json");
    fs.mkdirSync(TMP_ROOT, { recursive: true });
    fs.writeFileSync(testParamsPath, JSON.stringify(testParams, null, 2));

    // Spawn server without NODE_ENV=development (will be production mode)
    return new Promise((resolve, reject) => {
      serverProcess = spawnNode("node", ["index.js"], {
        cwd: SERVER_DIR,
        env: {
          ...process.env,
          // Explicitly NOT setting NODE_ENV=development
          FOURTHBRAIN_TEST_HARNESS: "1",
          FOURTHBRAIN_PARAMS_FILE: testParamsPath,
          FOURTHBRAIN_DB_PATH: path.join(TMP_ROOT, "4thbrain-metadata-e2e-prod.db"),
          FOURTHBRAIN_PORT_OVERRIDE: String(PROD_PORT),
        },
        stdio: "pipe",
      });

      serverProcess.stderr.on("data", (data) => {
        console.error(`Server stderr: ${data}`);
      });

      // Wait for server to be ready
      waitForServer(PROD_PORT).then((ready) => {
        if (ready) {
          resolve();
        } else {
          reject(new Error("Server failed to start in time"));
        }
      });

      serverProcess.on("error", reject);
    });
  });

  test.afterAll(async () => {
    if (serverProcess) {
      return new Promise((resolve) => {
        serverProcess.kill();
        serverProcess.on("exit", resolve);
        // Force kill after 5 seconds
        setTimeout(() => {
          try {
            process.kill(serverProcess.pid);
          } catch (e) {
            // Already dead
          }
          resolve();
        }, 5000);
      });
    }
  });

  test("admin route returns 403 in production mode", async ({ context }) => {
    const response = await context.request.get(
      `http://127.0.0.1:${PROD_PORT}/admin`
    );
    expect(response.status()).toBe(403);
  });

  test("admin/db route returns 403 in production mode", async ({ context }) => {
    const response = await context.request.get(
      `http://127.0.0.1:${PROD_PORT}/admin/db`
    );
    expect(response.status()).toBe(403);
  });

  test("api/tables route returns 403 in production mode", async ({ context }) => {
    const response = await context.request.get(
      `http://127.0.0.1:${PROD_PORT}/api/tables`
    );
    expect(response.status()).toBe(403);
  });

  test("api/docs route returns 403 in production mode", async ({ context }) => {
    const response = await context.request.get(
      `http://127.0.0.1:${PROD_PORT}/api/docs`
    );
    expect(response.status()).toBe(403);
  });

  test("chat route returns 200 in production mode (not gated)", async ({
    context,
  }) => {
    const response = await context.request.get(
      `http://127.0.0.1:${PROD_PORT}/chat`
    );
    expect(response.status()).toBe(200);
  });
});
