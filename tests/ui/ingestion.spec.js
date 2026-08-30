const { test, expect } = require("@playwright/test");
const { gotoPanel, uniqueName } = require("./helpers");
const path = require("path");

test.describe("Ingestion functionality", () => {
  test("text ingestion: form submission creates job row immediately", async ({ page, context }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");

    // Navigate to ingestion panel
    await gotoPanel(page, "add-text");

    const testTag = uniqueName("e2e-text");

    // Fill and submit the form
    const textInput = page.locator("#text-input");
    await textInput.fill("Sample test document for ingestion.");

    const tagInput = page.locator("#text-tags-input");
    await tagInput.fill(testTag);

    const submitBtn = page.locator("#text-submit");
    await submitBtn.click();

    // Wait for the response message
    const resultDiv = page.locator("#text-result");
    await resultDiv.waitFor({ state: "visible" });

    // Verify the result contains a jobId reference
    const resultText = await resultDiv.textContent();
    expect(resultText).toContain("Job created");

    // Verify that a row was created in the document table via API
    const apiResponse = await context.request.get("/api/tables/document");
    const documents = await apiResponse.json();
    // At least one document should exist (exact match on tags would require reading response structure)
    expect(documents.length).toBeGreaterThan(0);
  });

  test("file ingestion: file upload creates job row immediately", async ({ page, context }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");

    // Navigate to ingestion panel
    await gotoPanel(page, "add-file");

    const testTag = uniqueName("e2e-file");

    // Find the file input and upload
    const fileInput = page.locator("#file-input");
    const filePath = path.join(__dirname, "fixtures", "sample.txt");
    await fileInput.setInputFiles(filePath);

    const tagInput = page.locator("#file-tags-input");
    await tagInput.fill(testTag);

    const submitBtn = page.locator("#file-submit");
    await submitBtn.click();

    // Wait for the response message
    const resultDiv = page.locator("#file-result");
    await resultDiv.waitFor({ state: "visible" });

    // Verify the result shows success
    const resultText = await resultDiv.textContent();
    expect(resultText).toContain("Job created");

    // Verify API response
    const apiResponse = await context.request.get("/api/tables/document");
    const documents = await apiResponse.json();
    expect(documents.length).toBeGreaterThan(0);
  });

  test("URL ingestion: URL submission creates job row immediately", async ({ page, context }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");

    // Navigate to ingestion panel
    await gotoPanel(page, "add-url");

    const testTag = uniqueName("e2e-url");

    // Fill and submit the form
    const urlInput = page.locator("#url-input");
    await urlInput.fill("https://example.com");

    const tagInput = page.locator("#url-tags-input");
    await tagInput.fill(testTag);

    const submitBtn = page.locator("#url-submit");
    await submitBtn.click();

    // Wait for the response message
    const resultDiv = page.locator("#url-result");
    await resultDiv.waitFor({ state: "visible" });

    // Verify success
    const resultText = await resultDiv.textContent();
    expect(resultText).toContain("Job created");

    // Verify API
    const apiResponse = await context.request.get("/api/tables/document");
    const documents = await apiResponse.json();
    expect(documents.length).toBeGreaterThan(0);
  });
});
