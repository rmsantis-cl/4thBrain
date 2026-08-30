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
    - heading "📊 Tables" [level=2] [ref=e4]
    - generic [ref=e5]:
      - generic [ref=e6] [cursor=pointer]:
        - generic [ref=e7]: classification
        - generic [ref=e8]: 5 rows
      - generic [ref=e9] [cursor=pointer]:
        - generic [ref=e10]: document
        - generic [ref=e11]: 0 rows
      - generic [ref=e12] [cursor=pointer]:
        - generic [ref=e13]: document_tag
        - generic [ref=e14]: 0 rows
      - generic [ref=e15] [cursor=pointer]:
        - generic [ref=e16]: job
        - generic [ref=e17]: 0 rows
      - generic [ref=e18] [cursor=pointer]:
        - generic [ref=e19]: job_file
        - generic [ref=e20]: 0 rows
      - generic [ref=e21] [cursor=pointer]:
        - generic [ref=e22]: job_status
        - generic [ref=e23]: 4 rows
      - generic [ref=e24] [cursor=pointer]:
        - generic [ref=e25]: job_type
        - generic [ref=e26]: 4 rows
      - generic [ref=e27] [cursor=pointer]:
        - generic [ref=e28]: status
        - generic [ref=e29]: 5 rows
      - generic [ref=e30] [cursor=pointer]:
        - generic [ref=e31]: tag
        - generic [ref=e32]: 0 rows
    - heading "📈 Stats" [level=2] [ref=e33]
    - generic [ref=e34]:
      - generic [ref=e35]:
        - generic [ref=e36]: Tables
        - generic [ref=e37]: "9"
      - generic [ref=e38]:
        - generic [ref=e39]: Total Rows
        - generic [ref=e40]: "18"
      - generic [ref=e41]:
        - generic [ref=e42]: DB Size
        - generic [ref=e43]: 104 KB
      - generic [ref=e44]:
        - generic [ref=e45]: Last Modified
        - generic [ref=e46]: 8/29/2026, 9:16:42 PM
  - generic [ref=e47]:
    - generic [ref=e48]:
      - heading "tag" [level=1] [ref=e49]
      - generic [ref=e50]:
        - button "+ Insert" [ref=e51] [cursor=pointer]
        - generic [ref=e52]: NODE_ENV = development
    - generic [ref=e53]:
      - generic [ref=e54]:
        - generic [ref=e56]:
          - combobox [ref=e57]:
            - option "Filter by..." [selected]
            - option "name"
            - option "start_date"
            - option "end_date"
            - option "active"
          - textbox "value" [ref=e58]
          - button "Apply" [ref=e59] [cursor=pointer]
          - button "Clear" [ref=e60] [cursor=pointer]
        - table [ref=e62]:
          - rowgroup [ref=e63]:
            - row [ref=e64]:
              - columnheader "name ↕" [ref=e65] [cursor=pointer]
              - columnheader "start_date ↕" [ref=e66] [cursor=pointer]
              - columnheader "end_date ↕" [ref=e67] [cursor=pointer]
              - columnheader "active ↕" [ref=e68] [cursor=pointer]
              - columnheader "Actions" [ref=e69] [cursor=pointer]
          - rowgroup [ref=e70]:
            - row [ref=e71]:
              - cell "admin-edit-test-1788052605084-ew2zor" [ref=e72]
              - cell "2026-08-30T01:16:45.120Z" [ref=e73]
              - cell "null" [ref=e74]
              - cell "1" [ref=e75]
              - cell [ref=e76]:
                - generic [ref=e77]:
                  - button "Edit" [ref=e78] [cursor=pointer]
                  - button "Del" [ref=e79] [cursor=pointer]
      - generic [ref=e80]:
        - heading "Record Details" [level=3] [ref=e81]
        - generic [ref=e82]: "{ \"name\": \"admin-edit-test-1788052605084-ew2zor\", \"start_date\": \"2026-08-30T01:16:45.120Z\", \"end_date\": null, \"active\": 1 }"
        - button "Edit" [active] [ref=e83] [cursor=pointer]
        - button "Delete" [ref=e84] [cursor=pointer]
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