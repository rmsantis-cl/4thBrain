# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ingestion.spec.js >> Ingestion functionality >> text ingestion: form submission creates job row immediately
- Location: tests\ui\ingestion.spec.js:6:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#text-submit')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - complementary [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]: B4
      - text: 4thBrain
    - navigation [ref=e5]:
      - button "📎 Add file" [ref=e6] [cursor=pointer]:
        - generic [ref=e7]: 📎
        - text: Add file
      - button "Aa Add text" [ref=e8] [cursor=pointer]:
        - generic [ref=e9]: Aa
        - text: Add text
      - button "🔗 Add url" [ref=e10] [cursor=pointer]:
        - generic [ref=e11]: 🔗
        - text: Add url
      - button "▤ Ingest status" [ref=e12] [cursor=pointer]:
        - generic [ref=e13]: ▤
        - text: Ingest status
      - button "◎ Chat with Llama" [ref=e14] [cursor=pointer]:
        - generic [ref=e15]: ◎
        - text: Chat with Llama
      - button "✳ Chat with Claude" [ref=e16] [cursor=pointer]:
        - generic [ref=e17]: ✳
        - text: Chat with Claude
      - link "⚙ Admin" [ref=e18] [cursor=pointer]:
        - /url: /admin
        - generic [ref=e19]: ⚙
        - text: Admin
    - generic [ref=e20]: Recent
    - generic [ref=e21]:
      - generic [ref=e22]: Q3 planning notes.md
      - generic [ref=e24]: "Clipped: obsidian.md local-rest-api"
      - generic [ref=e26]: Meeting-transcript-08-25.pdf
      - generic [ref=e28]: vendor-contract-scan.pdf
    - generic [ref=e30]:
      - generic [ref=e31]: RS
      - generic [ref=e32]:
        - generic [ref=e33]: Ren
        - generic [ref=e34]: Local · Ollama
  - main [ref=e36]:
    - generic [ref=e37]:
      - heading "Add text" [level=1] [ref=e38]
      - paragraph [ref=e39]: Paste or type freeform text.
      - generic [ref=e41]:
        - textbox "Paste or type a note…" [ref=e42]: Sample test document for ingestion.
        - textbox "Tags (comma-separated)" [active] [ref=e43]: e2e-text-1788052605618-ki1l6s
        - button "Submit" [ref=e44] [cursor=pointer]
```

# Test source

```ts
  1   | const { test, expect } = require("@playwright/test");
  2   | const { gotoPanel, uniqueName } = require("./helpers");
  3   | const path = require("path");
  4   | 
  5   | test.describe("Ingestion functionality", () => {
  6   |   test("text ingestion: form submission creates job row immediately", async ({ page, context }) => {
  7   |     await page.goto("/chat");
  8   |     await page.waitForLoadState("networkidle");
  9   | 
  10  |     // Navigate to ingestion panel
  11  |     await gotoPanel(page, "add-text");
  12  | 
  13  |     const testTag = uniqueName("e2e-text");
  14  | 
  15  |     // Fill and submit the form
  16  |     const textInput = page.locator("#text-input");
  17  |     await textInput.fill("Sample test document for ingestion.");
  18  | 
  19  |     const tagInput = page.locator("#text-tags-input");
  20  |     await tagInput.fill(testTag);
  21  | 
  22  |     const submitBtn = page.locator("#text-submit");
> 23  |     await submitBtn.click();
      |                     ^ Error: locator.click: Test timeout of 30000ms exceeded.
  24  | 
  25  |     // Wait for the response message
  26  |     const resultDiv = page.locator("#text-result");
  27  |     await resultDiv.waitFor({ state: "visible" });
  28  | 
  29  |     // Verify the result contains a jobId reference
  30  |     const resultText = await resultDiv.textContent();
  31  |     expect(resultText).toContain("Job created");
  32  | 
  33  |     // Verify that a row was created in the document table via API
  34  |     const apiResponse = await context.request.get("/api/tables/document");
  35  |     const documents = await apiResponse.json();
  36  |     // At least one document should exist (exact match on tags would require reading response structure)
  37  |     expect(documents.length).toBeGreaterThan(0);
  38  |   });
  39  | 
  40  |   test("file ingestion: file upload creates job row immediately", async ({ page, context }) => {
  41  |     await page.goto("/chat");
  42  |     await page.waitForLoadState("networkidle");
  43  | 
  44  |     // Navigate to ingestion panel
  45  |     await gotoPanel(page, "add-file");
  46  | 
  47  |     const testTag = uniqueName("e2e-file");
  48  | 
  49  |     // Find the file input and upload
  50  |     const fileInput = page.locator("#file-input");
  51  |     const filePath = path.join(__dirname, "fixtures", "sample.txt");
  52  |     await fileInput.setInputFiles(filePath);
  53  | 
  54  |     const tagInput = page.locator("#file-tags-input");
  55  |     await tagInput.fill(testTag);
  56  | 
  57  |     const submitBtn = page.locator("#file-submit");
  58  |     await submitBtn.click();
  59  | 
  60  |     // Wait for the response message
  61  |     const resultDiv = page.locator("#file-result");
  62  |     await resultDiv.waitFor({ state: "visible" });
  63  | 
  64  |     // Verify the result shows success
  65  |     const resultText = await resultDiv.textContent();
  66  |     expect(resultText).toContain("Job created");
  67  | 
  68  |     // Verify API response
  69  |     const apiResponse = await context.request.get("/api/tables/document");
  70  |     const documents = await apiResponse.json();
  71  |     expect(documents.length).toBeGreaterThan(0);
  72  |   });
  73  | 
  74  |   test("URL ingestion: URL submission creates job row immediately", async ({ page, context }) => {
  75  |     await page.goto("/chat");
  76  |     await page.waitForLoadState("networkidle");
  77  | 
  78  |     // Navigate to ingestion panel
  79  |     await gotoPanel(page, "add-url");
  80  | 
  81  |     const testTag = uniqueName("e2e-url");
  82  | 
  83  |     // Fill and submit the form
  84  |     const urlInput = page.locator("#url-input");
  85  |     await urlInput.fill("https://example.com");
  86  | 
  87  |     const tagInput = page.locator("#url-tags-input");
  88  |     await tagInput.fill(testTag);
  89  | 
  90  |     const submitBtn = page.locator("#url-submit");
  91  |     await submitBtn.click();
  92  | 
  93  |     // Wait for the response message
  94  |     const resultDiv = page.locator("#url-result");
  95  |     await resultDiv.waitFor({ state: "visible" });
  96  | 
  97  |     // Verify success
  98  |     const resultText = await resultDiv.textContent();
  99  |     expect(resultText).toContain("Job created");
  100 | 
  101 |     // Verify API
  102 |     const apiResponse = await context.request.get("/api/tables/document");
  103 |     const documents = await apiResponse.json();
  104 |     expect(documents.length).toBeGreaterThan(0);
  105 |   });
  106 | });
  107 | 
```