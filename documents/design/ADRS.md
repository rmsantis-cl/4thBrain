---
name: ADRS
description: Architecture Decision Records for 4thBrain v04. ADR1-ADR24 are inherited from v03 and not restated here; v04's own decisions start at ADR25
metadata:
  version: 1.0
  created-by: Claude Code
  date: 2026-09-07
---

# Architecture Decision Records — v04

ADR1 through ADR24 belong to v03 and still apply where v04 kept the same design. They are not
restated here. The ones referenced most often in this repository:

| ADR | Subject |
|---|---|
| ADR14 | (inherited from v03) |
| ADR17 | Brief, serialized database transactions — the basis for `DatabaseService` being synchronized |
| ADR24 | (inherited from v03) |

Decisions made for v04 start at ADR25.

---

## ADR25 — Thymeleaf is the view layer; server-rendered pages live in `templates/`

**Date:** 2026-09-07
**Status:** Accepted
**Supersedes:** nothing
**Arises from:** BUG-001

### Context

Five endpoints across `UIController` and `AdminController` are annotated `@Controller` and return
view names — `"index"`, `"admin"`, `"admin-db"`, `"api-docs"`. `build.gradle` carried no view
technology, so those names reached Boot's default `InternalResourceViewResolver`, which forwards a
name with no suffix attached. `index` matches no mapping, so every one of the five returned 404.
The UI had never rendered.

Reading the four HTML files turned up something worth recording, because it makes the obvious fix
look better than it is:

- None of them contains a single Thymeleaf attribute. All four are plain HTML.
- None of the five controller methods takes a `Model` parameter or sets a model attribute. Nothing
  is passed to any view.
- `static/index.html` is a single-page app. It talks to the REST API over `fetch` and builds its own
  DOM in an inline `<script>`.

So the pages need serving, not rendering. The cheapest correct fix was to forward all five endpoints
to static files and move the three admin pages from `templates/` to `static/`, with no new
dependency at all.

### Decision

Add `spring-boot-starter-thymeleaf` anyway, and keep the controllers returning view names.

Server-rendered pages live in `src/main/resources/templates/`. `src/main/resources/static/` is for
assets a page links to — stylesheets, scripts, images — not for pages an endpoint serves.
`index.html` moves into `templates/`.

### Why, given the above

The decision is deliberately not the cheapest one, and the reason is what happens next rather than
what is true today.

`admin-db.html` is a database browser. Today it is a stub, and forwarding it to a static file would
work. The moment it shows real rows it needs to render a collection server-side, which is the thing
a template engine exists for, and at that point the static-file approach has to be unwound across
every page that took it. Installing the engine now sets one convention while there are four pages
to keep consistent instead of a dozen.

The cost of being wrong in this direction is one dependency on the classpath. The cost of being
wrong in the other direction is a second migration and two conventions living side by side.

Recorded plainly: this buys nothing at the moment it lands. Every page renders byte-identical
output to what forwarding would have produced. It is a bet on the roadmap, not a fix for a present
defect.

### Consequences

**For pages added from here on.** A page an endpoint serves goes in `templates/` and the controller
returns its name without an extension. A page needing no controller can stay in `static/` and be
reached at its own path, but that is the exception, not the pattern.

**Plain HTML is already a valid template.** Thymeleaf renders a file with no `th:` attributes
unchanged. Moving a page into `templates/` requires no edits to it, and it still opens correctly
from the filesystem in a browser.

**The one real trap — `${...}` in JavaScript.** JS template literals use the same delimiter as
Thymeleaf expressions:

```javascript
return `<a href="${item.href}">${item.label}</a>`;   // JS, not Thymeleaf
```

`index.html` is full of these. They are safe by default: Thymeleaf 3 evaluates expressions inside a
`<script>` only when the tag carries `th:inline="javascript"`, and a plain `<script>` is passed
through as raw text. Do not add `th:inline="javascript"` to a script block containing template
literals. If a block ever does need to be left strictly alone, mark it `th:inline="none"`.

Inline expressions in body text, `[[...]]` and `[(...)]`, are processed by default in Thymeleaf 3.
No current page uses that syntax; a page that wants those characters literally has to escape them.

**Templates are parsed, not copied.** Thymeleaf reads each page as a document, so malformed markup
that a browser would forgive can fail at render time. A page that previously "worked" as a static
file is not automatically a working template — it has to be loaded once to know.

**`templates/` is no longer dead.** The three admin files have been unreachable since they were
written. They become live pages under this decision, which means their content gets exercised for
the first time.

### Alternatives rejected

| | Why not |
|---|---|
| Forward all five endpoints to `static/` files, no dependency | Correct and smaller today. Rejected for the roadmap reason above, not on technical grounds. |
| Delete `UIController` and let Boot's welcome page serve `static/index.html` at `/` | Works for `/`, drops `/chat`, and leaves the admin pages broken. |
| Keep the controllers and delete the three admin templates | Discards the admin surface rather than deciding about it. |
