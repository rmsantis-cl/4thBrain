const { test, expect } = require("@playwright/test");
const { collectConsoleIssues } = require("./helpers");

test.describe("API documentation", () => {
  test("API docs page loads Scalar UI without errors @visual", async ({ page }) => {
    const issues = await collectConsoleIssues(page);

    await page.goto("/api/docs");
    await page.waitForLoadState("networkidle");

    // Wait for Scalar UI to initialize
    await page.waitForTimeout(1000);

    // Verify Scalar UI is visible (it renders as an iframe or custom element)
    const scalarcontent = page.locator("scalar-api-reference, [class*='scalar'], [data-scalar]");
    // At least one indicator that Scalar is loaded should exist
    const hasScalarIndicator =
      (await page.locator("scalar-api-reference").count()) > 0 ||
      (await page.locator("[data-testid*='scalar']").count()) > 0 ||
      (await page.textContent("body")).includes("Scalar");

    expect(hasScalarIndicator || (await page.title()).includes("API")).toBeTruthy();

    // Check for console errors
    const errors = issues.filter((i) => i.type === "error");
    expect(errors.length).toBe(0);

    await expect(page).toHaveScreenshot("api-docs.png");
  });

  test("openapi.json returns valid schema", async ({ context }) => {
    const response = await context.request.get("/api/docs/openapi.json");
    expect(response.ok()).toBeTruthy();

    const schema = await response.json();

    // Verify basic OpenAPI structure
    expect(schema).toHaveProperty("openapi");
    expect(schema).toHaveProperty("info");
    expect(schema).toHaveProperty("paths");

    // Verify at least some API endpoints are documented
    expect(Object.keys(schema.paths).length).toBeGreaterThan(0);

    // Verify tables API path exists
    const hasTablesPath = Object.keys(schema.paths).some(
      (path) => path.includes("/api/tables") || path.includes("tables")
    );
    expect(hasTablesPath).toBeTruthy();
  });
});
