# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.js >> Admin panel functionality >> admin DB: record detail, edit, delete lifecycle
- Location: tests\ui\admin.spec.js:91:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#edit-form input[name=\'end_date\']')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - heading "📊 Tables" [level=2]
    - generic:
      - generic [ref=e4] [cursor=pointer]:
        - generic: classification
        - generic: 5 rows
      - generic [ref=e5] [cursor=pointer]:
        - generic: document
        - generic: 0 rows
      - generic [ref=e6] [cursor=pointer]:
        - generic: document_tag
        - generic: 0 rows
      - generic [ref=e7] [cursor=pointer]:
        - generic: job
        - generic: 0 rows
      - generic [ref=e8] [cursor=pointer]:
        - generic: job_file
        - generic: 0 rows
      - generic [ref=e9] [cursor=pointer]:
        - generic: job_status
        - generic: 4 rows
      - generic [ref=e10] [cursor=pointer]:
        - generic: job_type
        - generic: 4 rows
      - generic [ref=e11] [cursor=pointer]:
        - generic: status
        - generic: 5 rows
      - generic [ref=e12] [cursor=pointer]:
        - generic: tag
        - generic: 1 rows
    - heading "📈 Stats" [level=2]
    - generic [ref=e13]:
      - generic:
        - generic [ref=e14]: Tables
        - generic [ref=e15]: "9"
      - generic:
        - generic [ref=e16]: Total Rows
        - generic [ref=e17]: "19"
      - generic:
        - generic [ref=e18]: DB Size
        - generic [ref=e19]: 104 KB
      - generic:
        - generic [ref=e20]: Last Modified
        - generic [ref=e21]: 8/29/2026, 9:16:45 PM
  - generic [ref=e22]:
    - generic [ref=e23]:
      - heading "tag" [level=1] [ref=e24]
      - generic [ref=e25]:
        - button "+ Insert" [ref=e26] [cursor=pointer]
        - generic [ref=e27]: NODE_ENV = development
    - generic [ref=e28]:
      - generic [ref=e29]:
        - generic [ref=e31]:
          - combobox [ref=e32]:
            - option "Filter by..." [selected]
            - option "name"
            - option "start_date"
            - option "end_date"
            - option "active"
          - textbox "value" [ref=e33]
          - button "Apply" [ref=e34] [cursor=pointer]
          - button "Clear" [ref=e35] [cursor=pointer]
        - table [ref=e37]:
          - rowgroup [ref=e38]:
            - row [ref=e39]:
              - columnheader "name ↕" [ref=e40] [cursor=pointer]
              - columnheader "start_date ↕" [ref=e41] [cursor=pointer]
              - columnheader "end_date ↕" [ref=e42] [cursor=pointer]
              - columnheader "active ↕" [ref=e43] [cursor=pointer]
              - columnheader "Actions" [ref=e44] [cursor=pointer]
          - rowgroup [ref=e45]:
            - row [ref=e46]:
              - cell "admin-edit-test-1788052605084-ew2zor" [ref=e47]
              - cell "2026-08-30T01:16:45.120Z" [ref=e48]
              - cell "null" [ref=e49]
              - cell "1" [ref=e50]
              - cell [ref=e51]:
                - generic [ref=e52]:
                  - button "Edit" [ref=e53] [cursor=pointer]
                  - button "Del" [ref=e54] [cursor=pointer]
            - row [ref=e55]:
              - cell "admin-edit-test-1788052618867-yo4ege" [ref=e56]
              - cell "2026-08-30T01:16:58.884Z" [ref=e57]
              - cell "null" [ref=e58]
              - cell "1" [ref=e59]
              - cell [ref=e60]:
                - generic [ref=e61]:
                  - button "Edit" [ref=e62] [cursor=pointer]
                  - button "Del" [ref=e63] [cursor=pointer]
      - generic [ref=e64]:
        - heading "Record Details" [level=3] [ref=e65]
        - generic [ref=e66]: "{ \"name\": \"admin-edit-test-1788052618867-yo4ege\", \"start_date\": \"2026-08-30T01:16:58.884Z\", \"end_date\": null, \"active\": 1 }"
        - button "Edit" [active] [ref=e67] [cursor=pointer]
        - button "Delete" [ref=e68] [cursor=pointer]
```

# Test source

```ts
  23  | 
  24  |   test("admin DB inspector: table selection, pagination, filtering work @visual", async ({
  25  |     page,
  26  |     context,
  27  |   }) => {
  28  |     await page.goto("/admin/db");
  29  |     await page.waitForLoadState("networkidle");
  30  | 
  31  |     // Create a fixture row in the tag table via API for testing
  32  |     const testTag = uniqueName("admin-test");
  33  |     const createResponse = await context.request.post("/api/tables/tag", {
  34  |       data: { name: testTag, start_date: new Date().toISOString() },
  35  |     });
  36  |     expect(createResponse.ok()).toBeTruthy();
  37  | 
  38  |     // Click the tag table
  39  |     await page.locator('.table-item[data-table="tag"]').click();
  40  |     await page.waitForLoadState("networkidle");
  41  | 
  42  |     // Verify table data displays
  43  |     const tableBody = page.locator("#table-body");
  44  |     await expect(tableBody).toBeVisible();
  45  | 
  46  |     // Check pagination controls
  47  |     const pagination = page.locator("#pagination");
  48  |     await expect(pagination).toBeVisible();
  49  | 
  50  |     // Test sorting
  51  |     const th = page.locator('th:has-text("name")');
  52  |     await th.click();
  53  |     await page.waitForTimeout(500);
  54  | 
  55  |     // Verify row order changed (simple check: first <td> text is different)
  56  |     const firstRowBefore = await page.locator("#table-body tr:first-child td:first-child").textContent();
  57  | 
  58  |     // Click again to reverse sort
  59  |     await th.click();
  60  |     await page.waitForTimeout(500);
  61  | 
  62  |     const firstRowAfter = await page.locator("#table-body tr:first-child td:first-child").textContent();
  63  |     // Note: this is a simple check; in a real scenario we'd have multiple rows
  64  | 
  65  |     // Test filtering
  66  |     const filterColSelect = page.locator("#filter-col");
  67  |     await filterColSelect.selectOption("name");
  68  | 
  69  |     const filterInput = page.locator("#filter-val");
  70  |     await filterInput.fill(testTag);
  71  | 
  72  |     const filterBtn = page.locator("#filter-btn");
  73  |     await filterBtn.click();
  74  |     await page.waitForTimeout(500);
  75  | 
  76  |     // Verify filtered results
  77  |     const filteredRows = await page.locator("#table-body tr").count();
  78  |     expect(filteredRows).toBeGreaterThanOrEqual(1);
  79  | 
  80  |     // Clear filter
  81  |     const clearBtn = page.locator("#clear-filter-btn");
  82  |     await clearBtn.click();
  83  |     await page.waitForTimeout(500);
  84  | 
  85  |     // Clean up: delete the test row
  86  |     await context.request.delete(`/api/tables/tag/${testTag}`);
  87  | 
  88  |     await expect(page).toHaveScreenshot("admin-db-tables.png");
  89  |   });
  90  | 
  91  |   test("admin DB: record detail, edit, delete lifecycle", async ({ page, context }) => {
  92  |     await page.goto("/admin/db");
  93  |     await page.waitForLoadState("networkidle");
  94  | 
  95  |     // Create a test tag via API
  96  |     const testTag = uniqueName("admin-edit-test");
  97  |     const createResponse = await context.request.post("/api/tables/tag", {
  98  |       data: { name: testTag, start_date: new Date().toISOString(), active: true },
  99  |     });
  100 |     expect(createResponse.ok()).toBeTruthy();
  101 | 
  102 |     // Select tag table
  103 |     await page.locator('.table-item[data-table="tag"]').click();
  104 |     await page.waitForLoadState("networkidle");
  105 | 
  106 |     // Find and click the test row
  107 |     const row = page.locator(`#table-body tr:has-text("${testTag}")`);
  108 |     await row.click();
  109 |     await page.waitForTimeout(300);
  110 | 
  111 |     // Verify detail panel shows
  112 |     const detailPanel = page.locator("#detail-panel");
  113 |     await expect(detailPanel).toHaveClass(/active/);
  114 | 
  115 |     // Open edit modal
  116 |     const editBtn = page.locator("#edit-btn");
  117 |     await editBtn.click();
  118 |     await page.waitForTimeout(300);
  119 | 
  120 |     // Update a field
  121 |     const endDateInput = page.locator("#edit-form input[name='end_date']");
  122 |     const newEndDate = new Date().toISOString().split("T")[0];
> 123 |     await endDateInput.fill(newEndDate);
      |                        ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  124 | 
  125 |     // Save
  126 |     const saveBtn = page.locator("button:has-text('Save')");
  127 |     await saveBtn.click();
  128 |     await page.waitForTimeout(500);
  129 | 
  130 |     // Verify the row still displays
  131 |     const rowAfterEdit = page.locator(`#table-body tr:has-text("${testTag}")`);
  132 |     await expect(rowAfterEdit).toBeVisible();
  133 | 
  134 |     // Open delete modal
  135 |     const deleteBtn = page.locator("#delete-btn");
  136 |     await deleteBtn.click();
  137 |     await page.waitForTimeout(300);
  138 | 
  139 |     // Confirm delete
  140 |     const confirmDeleteBtn = page.locator("button:has-text('Delete')");
  141 |     await confirmDeleteBtn.click();
  142 |     await page.waitForTimeout(500);
  143 | 
  144 |     // Verify row is gone (row might not exist anymore in the filtered view)
  145 |     // This is intentionally the cleanup step
  146 |   });
  147 | });
  148 | 
```