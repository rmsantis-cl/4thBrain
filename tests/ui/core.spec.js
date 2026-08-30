const { test, expect } = require("@playwright/test");
const { gotoPanel, collectConsoleIssues, assertNoHorizontalOverflow } = require("./helpers");

test.describe("Core UI functionality", () => {
  test("landing redirect: GET / → /chat @visual", async ({ page }) => {
    const response = await page.goto("/");
    expect(response.status()).toBe(302);

    await page.waitForURL("**/chat");
    expect(page.url()).toContain("/chat");

    // Wait for page to stabilize before taking snapshot
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("landing-redirect.png");
  });

  test("chat shell layout loads without console errors @visual", async ({ page }) => {
    const issues = await collectConsoleIssues(page);

    await page.goto("/chat");
    await page.waitForLoadState("networkidle");

    // Verify sidebar and main panel exist
    await expect(page.locator(".sidebar")).toBeVisible();
    await expect(page.locator(".main")).toBeVisible();

    // Collect any errors that occurred
    await page.waitForTimeout(500);

    // Check for console errors (ignoring certain warnings)
    const errors = issues.filter((i) => i.type === "error");
    expect(errors.length).toBe(0);

    await expect(page).toHaveScreenshot("chat-shell.png");
  });

  test("panel navigation: each nav-item switches panel correctly", async ({ page }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");

    // Get all nav items with data-panel attribute
    const navItems = await page.locator(".nav-item[data-panel]").all();
    expect(navItems.length).toBeGreaterThan(0);

    // Test each panel switch
    for (const navItem of navItems) {
      const panelName = await navItem.getAttribute("data-panel");
      if (panelName) {
        await gotoPanel(page, panelName);
        const panelId = `#panel-${panelName}`;
        await expect(page.locator(`${panelId}.active`)).toBeVisible();
      }
    }
  });
});
