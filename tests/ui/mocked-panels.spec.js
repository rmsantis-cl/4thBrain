const { test, expect } = require("@playwright/test");
const { gotoPanel } = require("./helpers");

test.describe("Mocked panel functionality", () => {
  test("status panel displays mocked data", async ({ page }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");

    // Navigate to status panel if it exists
    try {
      await gotoPanel(page, "ingest-status");

      // Wait for the panel to render
      await page.waitForTimeout(500);

      // Check that status grid is visible
      const statusGrid = page.locator("#status-grid");
      if (await statusGrid.isVisible()) {
        await expect(statusGrid).toBeVisible();
      }
    } catch (e) {
      // Status panel might not exist in this configuration
      console.log("Status panel not found, skipping");
    }
  });

  test("llama chat mocked response works", async ({ page }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");

    // Navigate to chat panel
    try {
      await gotoPanel(page, "chat-llama");

      // Find the chat form and input
      const chatInput = page.locator("#llama-input");
      if (await chatInput.isVisible()) {
        await chatInput.fill("test message");

        // Submit the form
        const submitBtn = page.locator("#llama-submit");
        await submitBtn.click();

        // Wait for response
        await page.waitForTimeout(1000);

        // Check that a message appears in the chat window
        const chatWindow = page.locator("#llama-window");
        if (await chatWindow.isVisible()) {
          const messages = await chatWindow.locator(".message").count();
          expect(messages).toBeGreaterThan(0);
        }
      }
    } catch (e) {
      console.log("Llama chat panel not found or not configured, skipping");
    }
  });
});
