# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile.spec.js >> Mobile responsiveness @mobile-360 >> chat page renders without horizontal overflow on 360px viewport
- Location: tests\ui\mobile.spec.js:7:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.main')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.main')

```

```yaml
- button "Toggle menu": ☰
- text: B4 4thBrain
- complementary:
  - text: B4 4thBrain
  - navigation:
    - button "📎 Add file"
    - button "Aa Add text"
    - button "🔗 Add url"
    - button "▤ Ingest status"
    - button "◎ Chat with Llama"
    - button "✳ Chat with Claude"
    - link "⚙ Admin":
      - /url: /admin
  - text: "Recent Q3 planning notes.md Clipped: obsidian.md local-rest-api Meeting-transcript-08-25.pdf vendor-contract-scan.pdf RS Ren Local · Ollama"
- main:
  - heading "Add file" [level=1]
  - paragraph: Drop a file or browse.
  - text: Drag a file here, or click to browse
  - textbox "Tags (comma-separated)"
```

# Test source

```ts
  1  | const { test, expect, devices } = require("@playwright/test");
  2  | const { assertNoHorizontalOverflow } = require("./helpers");
  3  | 
  4  | test.describe("Mobile responsiveness @mobile-360", () => {
  5  |   // These tests run in the mobile-360 project (360px viewport)
  6  | 
  7  |   test("chat page renders without horizontal overflow on 360px viewport", async ({
  8  |     page,
  9  |   }) => {
  10 |     await page.goto("/chat");
  11 |     await page.waitForLoadState("networkidle");
  12 | 
  13 |     // Verify main content is visible
  14 |     await expect(page.locator(".sidebar")).toBeVisible();
> 15 |     await expect(page.locator(".main")).toBeVisible();
     |                                         ^ Error: expect(locator).toBeVisible() failed
  16 | 
  17 |     // Check no horizontal overflow
  18 |     await assertNoHorizontalOverflow(page);
  19 |   });
  20 | 
  21 |   test("admin menu renders without horizontal overflow on 360px viewport", async ({
  22 |     page,
  23 |   }) => {
  24 |     await page.goto("/admin");
  25 |     await page.waitForLoadState("networkidle");
  26 | 
  27 |     // Verify page loaded
  28 |     const header = page.locator("h1");
  29 |     await expect(header).toBeVisible();
  30 | 
  31 |     // Check no horizontal overflow
  32 |     await assertNoHorizontalOverflow(page);
  33 |   });
  34 | 
  35 |   test("admin/db page renders without horizontal overflow on 360px viewport", async ({
  36 |     page,
  37 |   }) => {
  38 |     await page.goto("/admin/db");
  39 |     await page.waitForLoadState("networkidle");
  40 | 
  41 |     // Verify page loaded
  42 |     const sidebar = page.locator(".sidebar");
  43 |     if (await sidebar.isVisible()) {
  44 |       // Check no horizontal overflow
  45 |       await assertNoHorizontalOverflow(page);
  46 |     }
  47 |   });
  48 | 
  49 |   test("api docs page renders without horizontal overflow on 360px viewport", async ({
  50 |     page,
  51 |   }) => {
  52 |     await page.goto("/api/docs");
  53 |     await page.waitForLoadState("networkidle");
  54 | 
  55 |     // Wait for Scalar to load
  56 |     await page.waitForTimeout(1000);
  57 | 
  58 |     // Check no horizontal overflow
  59 |     await assertNoHorizontalOverflow(page);
  60 |   });
  61 | });
  62 | 
```