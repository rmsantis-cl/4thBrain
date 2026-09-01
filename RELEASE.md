# Release Procedure for 4thBrain

This document defines how completed Stories and bug fixes are grouped into a Release, versioned, tagged, and deployed. It covers versioning scheme, changelog maintenance, rollback procedures, and release checklists.

## Versioning Scheme

4thBrain follows [Semantic Versioning 2.0.0](https://semver.org/):

```
MAJOR.MINOR.PATCH
```

- **MAJOR** — Increment for breaking changes:
  - Changes to vault directory structure (e.g., `incoming` → `staging`)
  - Database schema changes (new/removed columns, table renames)
  - API breaking changes (endpoint removal, response format change)
  - CLI argument/configuration format changes
  - Requires manual migration steps documented in release notes

- **MINOR** — Increment for new features (completed Stories):
  - New ingestion capabilities (new file type support, new Story 1.x)
  - New UI panels or features (new Story 6.x)
  - New background processing capabilities (new Story 4.x)
  - Non-breaking API additions (new endpoint)
  - Database schema extensions (new columns, new tables) that don't break existing queries
  - Backward compatible; no migration required but schema version may change internally

- **PATCH** — Increment for bug fixes and documentation:
  - Bug fixes (resolving issues from `documets/bugs/`)
  - Documentation updates
  - Test coverage additions
  - Performance improvements with no user-facing changes
  - Backward compatible

## Release Workflow

### Step 1: Identify Completed Work

Before creating a release, verify that:
- All Stories in the release have their detail sections marked COMPLETED in `documets/BACKLOG-TRACKER.md`
- All Bugs assigned to the release have been fixed and closed in `documets/bugs/`
- All test suites pass locally (`npm test` in `server/` and `batch/`)
- No new Design Debt items are open (see `documets/DESIGN-DEBT.md`)

### Step 2: Update Version and Changelog

1. **Read the current version:**
   ```bash
   cat VERSION
   ```

2. **Determine new version number** using the scheme above. For example:
   - If Stories 6.5, 9.1, 11.1 are completed (new features) → MINOR bump (0.1.0 → 0.2.0)
   - If Bug-1 is fixed but no new Stories → PATCH bump (0.1.0 → 0.1.1)

3. **Update VERSION file:**
   ```bash
   echo "0.2.0" > VERSION
   ```

4. **Update CHANGELOG.md:**
   - Add a new section at the top:
     ```markdown
     ## [0.2.0] — 2026-09-15

     ### Added
     - **Story 6.5** — Chat with Llama description
     - **Story 9.1** — Local-Only Access Enforcement description
     - **Story 11.1** — Release Packaging & Versioning description

     ### Fixed
     - Bug-1 — Brief description of fix

     ### Changed
     - Documentation updates, performance improvements, etc.
     ```
   - List all COMPLETED Stories and closed Bugs
   - Include a brief summary of each (1–2 sentences)
   - Mark "Known Limitations" section with new blockers (Stories still WIP/READY)

### Step 3: Create a Git Tag

Once VERSION and CHANGELOG.md are updated and committed:

```bash
git tag -a v0.2.0 -m "Release 0.2.0: Stories 6.5, 9.1, 11.1 + Bug-1 fix"
git push origin v0.2.0
```

The tag format is `v{MAJOR}.{MINOR}.{PATCH}`, matching the VERSION file.

### Step 4: Release Notes (Optional but Recommended)

Create a release notes document for significant releases (MINOR or MAJOR bumps):

```markdown
# 4thBrain Release 0.2.0

**Release Date:** 2026-09-15
**Git Tag:** v0.2.0

## What's New

### Stories Shipped
- Story 6.5: Real Ollama chat wiring
- Story 9.1: Local-only access enforcement
- Story 11.1: Release packaging process

### Bug Fixes
- Bug-1: Fixed schema mismatch in repository layer

## Migration Guide

No database migrations required for this release.

## Known Issues

- Story 2.1 (Classification) still WIP — tags/metadata not yet inferred
- Story 7.2 (MCP Server Setup) blocked on systemd configuration work

## Support

For issues or questions, see `documets/DESIGN-DEBT.md` for known gaps and `documets/bugs/` for reported issues.
```

## Rollback Procedure

If a release is found to have a critical issue:

### 1. Identify the Previous Release

```bash
git tag -l | sort -V | tail -2
# Example output:
#   v0.1.0
#   v0.2.0
```

The second-to-last tag is the previous release to roll back to.

### 2. Revert Code Changes

```bash
# Option A: Check out the previous release tag (read-only)
git checkout v0.1.0

# Option B: Create a new branch for hotfix and revert commits (preferred for production)
git checkout -b hotfix/critical-issue main
git revert HEAD~2..HEAD  # Revert the last 2 commits (example; adjust as needed)
git push origin hotfix/critical-issue
# Then merge and tag as a new PATCH release (0.2.1)
```

### 3. Database Rollback

If the release involved database schema changes:

1. **Identify the schema version** from `CHANGELOG.md` for the previous release
2. **Locate the backup** of the database from before the update:
   - Development: `scripts/reset-dev-db.ps1` keeps backups in `.backup/`
   - Production: see "Backup Strategy" below

3. **Restore the database** (only if schema incompatibility confirmed):
   ```bash
   # Backup current database
   cp server/4thbrain-metadata.db server/4thbrain-metadata.db.backup
   # Restore previous version
   cp .backup/4thbrain-metadata.db.{YYYYMMDD} server/4thbrain-metadata.db
   ```

4. **Test the server** with rolled-back code and restored database to confirm functionality

### 4. Update VERSION and CHANGELOG

After confirming the rollback works:

```bash
echo "0.1.0" > VERSION  # Revert to previous version
```

Do NOT update CHANGELOG.md unless the rollback is permanent; if it's a temporary step, keep a note in the "Known Issues" section of the current release.

## Backup Strategy

### Development

The `scripts/reset-dev-db.ps1` script automatically backs up the database before dropping/resetting:

```bash
# Backup location: .backup/4thbrain-metadata.db.{YYYYMMDD}.bak
ls .backup/4thbrain-metadata.db.*
```

### Production

Before each release (or at least weekly), create a backup:

1. **Database snapshot:**
   ```bash
   cp server/4thbrain-metadata.db .backup/4thbrain-metadata.db.prod.{date +%Y%m%d}
   ```

2. **Vault snapshot:**
   ```bash
   # Story 10.1 will automate this; for now, manual backup:
   tar -czf .backup/vault-snapshot.{date +%Y%m%d}.tar.gz "$VAULT_DIR"
   ```

3. **Backup retention:** Keep at least 2 weeks of daily snapshots

## Release Checklist

### Pre-Release

- [ ] All Stories assigned to this release are marked COMPLETED in BACKLOG-TRACKER
- [ ] All Bugs assigned to this release are closed
- [ ] `npm test` passes in `server/` directory
- [ ] `npm test` passes in `batch/` directory (if applicable)
- [ ] DESIGN-DEBT has no open items for this release
- [ ] No critical errors in `documets/bugs/` for unreleased issues

### Release

- [ ] VERSION file updated to new version number
- [ ] CHANGELOG.md updated with new section (added, fixed, changed, known limitations)
- [ ] All changes committed to `main` branch
- [ ] Git tag created and pushed (`git tag -a v{VERSION}` + `git push origin v{VERSION}`)
- [ ] (Optional) Release notes document created

### Post-Release

- [ ] Database backup created (production environments)
- [ ] Vault backup created (production environments)
- [ ] Release communicated to team/users (if applicable)
- [ ] GitHub release page created with changelog excerpt (if public repo)

## Version Numbering Examples

| Scenario | Old Version | New Version | Reason |
|----------|---|---|---|
| Stories 6.5, 9.1 shipped | 0.1.0 | 0.2.0 | MINOR: new features |
| Bug-1 fixed only | 0.2.0 | 0.2.1 | PATCH: bug fix |
| Schema redesign + Stories 12.2, 13.3 | 0.2.1 | 0.3.0 | MINOR: database extensions (non-breaking) |
| Database column removed (breaking) | 0.3.0 | 1.0.0 | MAJOR: breaking schema change |
| Rollback from 0.2.0 to 0.1.0 | 0.2.0 | 0.1.0 | Use git checkout v0.1.0; do not create new version |
| Hotfix after 0.2.0 rollback | 0.1.0 | 0.2.1 | PATCH: bug fix version skips 0.2.0 |

---

## Long-Term Maintenance

As the project matures beyond Phase 5:

1. **Automated version bumping** — Consider CI/CD integration to auto-update VERSION and CHANGELOG based on git commit history (e.g., conventional commits)
2. **Release notes generation** — Tools like `changeloggen` can auto-generate changelogs from commit messages
3. **Semantic release plugins** — For npm packages, semantic-release automates versioning and tagging
4. **Database migration tracking** — As schema complexity grows, migrate to Liquibase or Flyway for schema versioning
5. **Rolling deployment** — If deployed across multiple machines, plan gradual rollout and health checks

For now, this manual process ensures clarity and intentionality at release time.
