# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dev-gating.spec.js >> Dev-only route gating >> api/tables route returns 403 in production mode
- Location: tests\ui\dev-gating.spec.js:125:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 403
Received: 404
```

# Test source

```ts
  29  |         return true;
  30  |       }
  31  |     } catch (e) {
  32  |       // Connection not ready yet
  33  |     }
  34  |     await new Promise((resolve) => setTimeout(resolve, 100));
  35  |   }
  36  |   return false;
  37  | }
  38  | 
  39  | test.describe("Dev-only route gating", () => {
  40  |   let serverProcess;
  41  | 
  42  |   test.beforeAll(async () => {
  43  |     // Ensure port is available
  44  |     const available = await checkPortAvailable(PROD_PORT);
  45  |     if (!available) {
  46  |       throw new Error(`Port ${PROD_PORT} is already in use`);
  47  |     }
  48  | 
  49  |     // Create test params file for isolated server
  50  |     const testParams = JSON.parse(
  51  |       fs.readFileSync(path.join(__dirname, "..", "..", "params.json"), "utf-8")
  52  |     );
  53  |     testParams.vault_dir = path.join(TMP_ROOT, "vault-prod");
  54  |     testParams.raw_dir = path.join(TMP_ROOT, "raw-prod");
  55  |     testParams.server_bind_host = "127.0.0.1";
  56  | 
  57  |     const testParamsPath = path.join(TMP_ROOT, "params-prod.json");
  58  |     fs.mkdirSync(TMP_ROOT, { recursive: true });
  59  |     fs.writeFileSync(testParamsPath, JSON.stringify(testParams, null, 2));
  60  | 
  61  |     // Spawn server without NODE_ENV=development (will be production mode)
  62  |     return new Promise((resolve, reject) => {
  63  |       serverProcess = spawnNode("node", ["index.js"], {
  64  |         cwd: SERVER_DIR,
  65  |         env: {
  66  |           ...process.env,
  67  |           // Explicitly NOT setting NODE_ENV=development
  68  |           FOURTHBRAIN_TEST_HARNESS: "1",
  69  |           FOURTHBRAIN_PARAMS_FILE: testParamsPath,
  70  |           FOURTHBRAIN_DB_PATH: path.join(TMP_ROOT, "4thbrain-metadata-e2e-prod.db"),
  71  |           FOURTHBRAIN_PORT_OVERRIDE: String(PROD_PORT),
  72  |         },
  73  |         stdio: "pipe",
  74  |       });
  75  | 
  76  |       serverProcess.stderr.on("data", (data) => {
  77  |         console.error(`Server stderr: ${data}`);
  78  |       });
  79  | 
  80  |       // Wait for server to be ready
  81  |       waitForServer(PROD_PORT).then((ready) => {
  82  |         if (ready) {
  83  |           resolve();
  84  |         } else {
  85  |           reject(new Error("Server failed to start in time"));
  86  |         }
  87  |       });
  88  | 
  89  |       serverProcess.on("error", reject);
  90  |     });
  91  |   });
  92  | 
  93  |   test.afterAll(async () => {
  94  |     if (serverProcess) {
  95  |       return new Promise((resolve) => {
  96  |         serverProcess.kill();
  97  |         serverProcess.on("exit", resolve);
  98  |         // Force kill after 5 seconds
  99  |         setTimeout(() => {
  100 |           try {
  101 |             process.kill(serverProcess.pid);
  102 |           } catch (e) {
  103 |             // Already dead
  104 |           }
  105 |           resolve();
  106 |         }, 5000);
  107 |       });
  108 |     }
  109 |   });
  110 | 
  111 |   test("admin route returns 403 in production mode", async ({ context }) => {
  112 |     const response = await context.request.get(
  113 |       `http://127.0.0.1:${PROD_PORT}/admin`
  114 |     );
  115 |     expect(response.status()).toBe(403);
  116 |   });
  117 | 
  118 |   test("admin/db route returns 403 in production mode", async ({ context }) => {
  119 |     const response = await context.request.get(
  120 |       `http://127.0.0.1:${PROD_PORT}/admin/db`
  121 |     );
  122 |     expect(response.status()).toBe(403);
  123 |   });
  124 | 
  125 |   test("api/tables route returns 403 in production mode", async ({ context }) => {
  126 |     const response = await context.request.get(
  127 |       `http://127.0.0.1:${PROD_PORT}/api/tables`
  128 |     );
> 129 |     expect(response.status()).toBe(403);
      |                               ^ Error: expect(received).toBe(expected) // Object.is equality
  130 |   });
  131 | 
  132 |   test("api/docs route returns 403 in production mode", async ({ context }) => {
  133 |     const response = await context.request.get(
  134 |       `http://127.0.0.1:${PROD_PORT}/api/docs`
  135 |     );
  136 |     expect(response.status()).toBe(403);
  137 |   });
  138 | 
  139 |   test("chat route returns 200 in production mode (not gated)", async ({
  140 |     context,
  141 |   }) => {
  142 |     const response = await context.request.get(
  143 |       `http://127.0.0.1:${PROD_PORT}/chat`
  144 |     );
  145 |     expect(response.status()).toBe(200);
  146 |   });
  147 | });
  148 | 
```