# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: core.spec.js >> Core UI functionality >> panel navigation: each nav-item switches panel correctly
- Location: tests\ui\core.spec.js:37:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('.nav-item[data-panel="add-file"]')
    - locator resolved to <button data-panel="add-file" class="nav-item active">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - element is outside of the viewport
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - element is outside of the viewport
    - retrying click action
      - waiting 100ms
    56 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - element is outside of the viewport
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - button "Toggle menu" [ref=e3] [cursor=pointer]: ☰
    - generic [ref=e4]:
      - generic [ref=e5]: B4
      - text: 4thBrain
  - complementary [ref=e6]:
    - generic [ref=e7]:
      - generic [ref=e8]: B4
      - text: 4thBrain
    - navigation [ref=e9]:
      - button "📎 Add file" [ref=e10] [cursor=pointer]:
        - generic [ref=e11]: 📎
        - text: Add file
      - button "Aa Add text" [ref=e12] [cursor=pointer]:
        - generic [ref=e13]: Aa
        - text: Add text
      - button "🔗 Add url" [ref=e14] [cursor=pointer]:
        - generic [ref=e15]: 🔗
        - text: Add url
      - button "▤ Ingest status" [ref=e16] [cursor=pointer]:
        - generic [ref=e17]: ▤
        - text: Ingest status
      - button "◎ Chat with Llama" [ref=e18] [cursor=pointer]:
        - generic [ref=e19]: ◎
        - text: Chat with Llama
      - button "✳ Chat with Claude" [ref=e20] [cursor=pointer]:
        - generic [ref=e21]: ✳
        - text: Chat with Claude
      - link "⚙ Admin" [ref=e22] [cursor=pointer]:
        - /url: /admin
        - generic [ref=e23]: ⚙
        - text: Admin
    - generic [ref=e24]: Recent
    - generic [ref=e25]:
      - generic [ref=e26]: Q3 planning notes.md
      - generic [ref=e28]: "Clipped: obsidian.md local-rest-api"
      - generic [ref=e30]: Meeting-transcript-08-25.pdf
      - generic [ref=e32]: vendor-contract-scan.pdf
    - generic [ref=e34]:
      - generic [ref=e35]: RS
      - generic [ref=e36]:
        - generic [ref=e37]: Ren
        - generic [ref=e38]: Local · Ollama
  - main [ref=e40]:
    - generic [ref=e41]:
      - heading "Add file" [level=1] [ref=e42]
      - paragraph [ref=e43]: Drop a file or browse.
      - generic [ref=e44]:
        - generic [ref=e45] [cursor=pointer]: Drag a file here, or click to browse
        - textbox "Tags (comma-separated)" [ref=e46]
```

# Test source

```ts
  1  | /**
  2  |  * Helper functions for Playwright tests
  3  |  */
  4  | 
  5  | async function gotoPanel(page, panelName) {
  6  |   // Click the nav item with matching data-panel attribute
  7  |   const navItem = page.locator(`.nav-item[data-panel="${panelName}"]`);
> 8  |   await navItem.click();
     |                 ^ Error: locator.click: Test timeout of 30000ms exceeded.
  9  | 
  10 |   // Wait for the panel to become active
  11 |   const panelSelector = `#panel-${panelName}`;
  12 |   await page.locator(`${panelSelector}.active`).waitFor({ state: "visible" });
  13 | }
  14 | 
  15 | async function collectConsoleIssues(page) {
  16 |   const issues = [];
  17 | 
  18 |   page.on("console", (msg) => {
  19 |     if (msg.type() === "error") {
  20 |       issues.push({ type: "error", text: msg.text() });
  21 |     }
  22 |   });
  23 | 
  24 |   page.on("pageerror", (error) => {
  25 |     issues.push({ type: "exception", text: error.toString() });
  26 |   });
  27 | 
  28 |   return issues;
  29 | }
  30 | 
  31 | async function assertNoHorizontalOverflow(page) {
  32 |   const overflowWidth = await page.evaluate(
  33 |     () => document.documentElement.scrollWidth
  34 |   );
  35 |   const viewportWidth = await page.evaluate(() => window.innerWidth);
  36 | 
  37 |   // Allow 1px tolerance for rounding errors
  38 |   if (overflowWidth > viewportWidth + 1) {
  39 |     throw new Error(
  40 |       `Horizontal overflow detected: scrollWidth=${overflowWidth}, innerWidth=${viewportWidth}`
  41 |     );
  42 |   }
  43 | }
  44 | 
  45 | function uniqueName(prefix = "test") {
  46 |   return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  47 | }
  48 | 
  49 | module.exports = {
  50 |   gotoPanel,
  51 |   collectConsoleIssues,
  52 |   assertNoHorizontalOverflow,
  53 |   uniqueName,
  54 | };
  55 | 
```