/**
 * Helper functions for Playwright tests
 */

async function gotoPanel(page, panelName) {
  // Click the nav item with matching data-panel attribute
  const navItem = page.locator(`.nav-item[data-panel="${panelName}"]`);
  await navItem.click();

  // Wait for the panel to become active
  const panelSelector = `#panel-${panelName}`;
  await page.locator(`${panelSelector}.active`).waitFor({ state: "visible" });
}

async function collectConsoleIssues(page) {
  const issues = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      issues.push({ type: "error", text: msg.text() });
    }
  });

  page.on("pageerror", (error) => {
    issues.push({ type: "exception", text: error.toString() });
  });

  return issues;
}

async function assertNoHorizontalOverflow(page) {
  const overflowWidth = await page.evaluate(
    () => document.documentElement.scrollWidth
  );
  const viewportWidth = await page.evaluate(() => window.innerWidth);

  // Allow 1px tolerance for rounding errors
  if (overflowWidth > viewportWidth + 1) {
    throw new Error(
      `Horizontal overflow detected: scrollWidth=${overflowWidth}, innerWidth=${viewportWidth}`
    );
  }
}

function uniqueName(prefix = "test") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

module.exports = {
  gotoPanel,
  collectConsoleIssues,
  assertNoHorizontalOverflow,
  uniqueName,
};
