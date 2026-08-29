# **PROPOSAL V9**

Node Server Refactor — /, /chat, /admin \+ Unified CRUD REST API

## **1\. Context**

The Node server lives in server/ (Express \+ node:sqlite). Today it exposes a single page (GET /chat) that embeds an admin panel inline, plus a second independent admin table-browser at /admin/db (server/routes/admin-db.js). All DB access is raw, ad-hoc db.prepare() SQL scattered across services.  
The goal is consolidation: single-page-per-route UI (/chat, /admin), / redirecting to /chat, and all data operations routing through a central CRUD REST API.

## **2\. Decisions Made**

| \# | Decision | Alternative Considered / Notes   |
| :---: | ----- | ----- |
| D1 | **\[REJECTED\]** Restore schema.sql to the full 9-table structure. *User Comment:* Rejected. The bug was caused by the coding agent inventing tables without proper documentation or approval. The schema issues have been corrected. | Treat reduced 6-table edit as new intended design. |
| D2 | **\[REVISED\]** Centralize all data access strictly through the REST API for all clients and server operations. *User Comment:* All data access must strictly go through the REST API to centralize data handling and prevent architectural bloat and separate access pathways. | Shared in-process repository modules bypassing REST endpoints. |
| D3 | **\[APPROVED & UPDATED\]** Implement per-table REST APIs for table maintenance and specific data handling/retrieval, exposed via Scalar for clean interactive API documentation and Web UI. *User Comment:* Generic introspection alone is insufficient because database business rules and validations must be explicitly maintained. All REST APIs must be documented and exposed through a Scalar Web UI. (Note: Scalar is the designated interface; Swagger is excluded). | Pure generic reflection without domain rules, explicit validation, or interactive Scalar API documentation. |
| D4 | **\[APPROVED\]** Route topology: GET / → redirect to /chat; admin page moves from /admin/db to /admin; CRUD API moves from /admin/db/api/\* to /api/tables/\* (un-admin-scoped) — hard cut, no legacy alias. | Keep API nested under /admin/api/\*, or keep a redirect from the old /admin/db path. |
| D5 | **\[DEFERRED\]** /api/tables/\* stays entirely behind the existing NODE\_ENV=development gate (same as today), for both reads and writes, until auth exists. | Open GET (read) endpoints to all environments for future /chat use. |
| D6 | **\[APPROVED\]** Delete the duplicate embedded admin panel markup/JS in server/ui/page.js (renderAdminPanel) and server/ui/client.js — /admin becomes the sole owner of that UI. | Keep duplicate embedded markup in the chat shell. |
| D7 | **\[APPROVED\]** Log this refactor as new Story 13.3 under EP13 (Admin & Monitoring Tools). | Split route restructuring into EP6 and CRUD-layer generalization into EP13. |

## **3\. General Notes & Directives**

> * **Coding Agent Directive:** The coding agent previously created unauthorized table additions without proper documentation or a formally approved proposal. The coding agent must strictly adhere to formal plans, architecture specifications, and documentation, and must NOT engage in unapproved "vibe coding" or arbitrary code modifications.  
> * **Process Design Next Steps (User Comment):** A state diagram was created to reflect the flow of documents, options, and processes involved within the system. While this proposal centers mainly on the UI and schema, the next immediate phase requires moving forward with designing and reviewing those specific document processes.

## **4\. Draft Story 13.3: Route Restructuring & Unified CRUD REST API Access**

> * **Description:** Consolidate server routes into GET / (redirecting to /chat), /chat, and /admin, eliminating duplicate inline admin code. Expose explicit, per-table REST endpoints for all data operations (documented via Scalar) and refactor server components (e.g., ingest-service.js) to route all database access strictly through these REST endpoints.  
> * **Acceptance Criteria:**  
  * GET / redirects to /chat.  
  * /chat contains no embedded admin panel.  
  * /admin serves as the sole table management interface.  
  * All database operations route strictly through the REST API layer; no direct SQL / db.prepare() calls remain scattered in application services.  
  * Scalar interactive Web UI documentation is mounted and accessible for testing all REST API endpoints.  
> * **Dependencies:** Story 6.4, Story 13.1.  
> * **Status:** Approved for implementation planning.

## **5\. Draft Exploratory Story: Single-User Authentication & Security Evaluation**

> * **Story Title:** Exploratory Investigation: Passkey & Single-User Authentication Options  
> * **Description:** Before implementing production authentication gates across endpoints, conduct an architectural spike to investigate lightweight security mechanisms tailored for a single-user system. Evaluate passkeys (WebAuthn/FIDO2), simple token/cookie schemes, and minimal passkey implementations to determine the optimal balance of security and friction.  
> * **Acceptance Criteria:**  
  * Technical evaluation document detailing 2-3 viable single-user auth mechanisms (e.g., WebAuthn passkeys vs. secure pre-shared tokens).  
  * Impact assessment on REST API endpoints (/api/tables/\*) and Web UIs (/chat, /admin, Scalar UI).  
  * Recommended security architecture baseline and implementation effort estimate for a future authentication Epic/Story.  
> * **Dependencies:** None (Exploratory / Spike).  
> * **Status:** Proposed (Pre-implementation).

## **6\. Design Debt Entries**

| ID | Description | Raised During | Status | Resolution   |
| :---: | ----- | :---: | :---: | ----- |
| DD1 | No Epic/Story covered unifying data access into a per-table REST API used strictly across the application before this refactor was planned. | Planning server refactor (2026-08-28) | Resolved | Draft Story 13.3 approved and logged under EP13. |
| DD2 | Schema discrepancies caused by unauthorized table additions in working tree vs. classes.md specifications. | Schema audit (2026-08-28) | Resolved | Decision D1 rejected unauthorized table additions. User corrected schema issues directly in code/configuration. |

