const { test, expect, devices } = require("@playwright/test");
const { assertNoHorizontalOverflow } = require("./helpers");

test.describe("Mobile responsiveness @mobile-360", () => {
  // These tests run in the mobile-360 project (360px viewport)

  test("chat page renders without horizontal overflow on 360px viewport", async ({
    page,
  }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");

    // Verify main content is visible
    await expect(page.locator(".sidebar")).toBeVisible();
    await expect(page.locator(".main")).toBeVisible();

    // Check no horizontal overflow
    await assertNoHorizontalOverflow(page);
  });

  test("admin menu renders without horizontal overflow on 360px viewport", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Verify page loaded
    const header = page.locator("h1");
    await expect(header).toBeVisible();

    // Check no horizontal overflow
    await assertNoHorizontalOverflow(page);
  });

  test("admin/db page renders without horizontal overflow on 360px viewport", async ({
    page,
  }) => {
    await page.goto("/admin/db");
    await page.waitForLoadState("networkidle");

    // Verify page loaded
    const sidebar = page.locator(".sidebar");
    if (await sidebar.isVisible()) {
      // Check no horizontal overflow
      await assertNoHorizontalOverflow(page);
    }
  });

  test("api docs page renders without horizontal overflow on 360px viewport", async ({
    page,
  }) => {
    await page.goto("/api/docs");
    await page.waitForLoadState("networkidle");

    // Wait for Scalar to load
    await page.waitForTimeout(1000);

    // Check no horizontal overflow
    await assertNoHorizontalOverflow(page);
  });
});
