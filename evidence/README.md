# Leads TESTE — validation in isolated worktree

## Scope and outcome
- Desktop via direct SSH; branch `feature/hubrrd-test-data-lifecycle-20261013`.
- HEAD unchanged: `ccf3b18a40eb744af7f4c4bd127b4aa820dafa44`.
- API create/read/purge validated. No claim of full CRUD, Sofia integration, UI acceptance, or production readiness.
- No commit, push, deployment, production migration, production DB connection or external delivery.
- All rows used were synthetic in a newly initialized disposable cluster. No production data was copied.

## Corrected defects
1. Raw SQL `select *` produced snake_case despite TypeScript casts, bypassing `testRunId` guards and breaking proposal `leadId`/conversion `normalizedPhone`. Locked reads now use typed Drizzle selects.
2. Numeric synthetic phones could collide with real/dialable contacts. Identity now uses `TEST:` plus the full UUID encoded as 32 letters a-p; digit-only normalization yields empty text.
3. Purge counted dependencies by lead only and could SET NULL another lead's address reference. Counts now come from live inbound FK metadata for both parents, using schema-qualified/quoted identifiers and address IDs independently of lead ownership.
4. Purge locks parent tables against FK DDL, parent rows against concurrent FK insertion, and generic audit writes while inventory and deletion run in one transaction. Unknown, cross-schema, composite and unexpected-parent-column relationships fail closed.

## Real evidence
| Gate | Result | Log |
|---|---|---|
| Initial PostgreSQL reproduction | 3 actual behavior failures (phone/proposal/cross-lead address) | `red-postgres.log` |
| Compiled Next HTTP + PostgreSQL | 18 scenarios passed, 0 failed | `postgres-built-final.log` |
| Unit suite | 218 passed, 0 failed | `unit-final.log` |
| Full security/regression suite | 226 passed, 0 failed | `security.log` |
| Typecheck | exit 0 | `typecheck-final.log` |
| Next build | exit 0 | `build.log` |
| Canonical template compiled runtime | HTTP 200; 2 pages, 2 images | `stored-template-build.log` |
| Harness deliberate occupied-port failure | exit 1 | `harness-negative-control.log` |
| Cleanup, branch, HEAD, diff check | ports closed, no disposable data directories, diff check 0 | `final-state.json` |

The 18 HTTP/database scenarios include real session+permission checks (no authorization mock), create/read/list/purge, zero remaining run rows, byte-equivalent audit and unmarked control lead/address, PII injection, malformed/missing/wrong run, real/unmarked-lead denial, each existing child dependency, unknown FK to each parent (empty and populated), same-name foreign-schema FK, test proposal creation/approval and direct conversion guards, positive unmarked proposal-to-client conversion, concurrent double purge, inflight cross-lead address reference with actual PostgreSQL lock wait, non-NEW/converted denial.

The empty cluster executed all 22 journal-listed SQL migrations in order, including 0021. This proves the SQL/schema against an empty DB, not production migration history compatibility or the Drizzle migration runner.

## Reproduce
From this worktree, as the desktop's non-root user:

```sh
npm install --prefix ../rrd-disposable-pg embedded-postgres@18.4.0-beta.17
npm run build
RRD_TEST_BUILT=1 node scripts/test-lead-postgres.mjs
npm run test:unit
npm run test:security
npx tsc --noEmit --pretty false
npm run test:stored-template:build
git diff --check
```

The harness uses PostgreSQL 18, loopback 55439 and Next loopback 31439. It creates a unique scratch cluster, overrides both database variables to that cluster, and shuts down/deletes it in `finally`. It defaults to Next dev unless `RRD_TEST_BUILT=1`; final evidence uses the compiled build via `next start`, not the production start/seeding script. Only the scratch npm dependency/cache remains for reproducibility; no global package or service was installed. No `.env` containing credentials exists in this worktree (`.env.example` only).

## Artifacts and limitations
- `implementation.patch`: tracked plus new source/test/script diff (not just `git diff --stat`, which omits untracked files).
- `source-sha256.json`: exact hashes of the 20 changed/new source/test/script files.
- `http-server.log`, `http-server-errors.log`: last compiled-runtime HTTP execution.
- Build warnings: deprecated middleware convention; pdfjs-dist ESM externalization warning. The separate compiled template probe passed despite that warning.
- Purge intentionally blocks if an unknown inbound FK exists even without rows. Its conservative table locks serialize operations briefly; no production load test was attempted.
- Validation used PostgreSQL 18, not production-version parity. No production compatibility or rollout acceptance is claimed.
- The initial RED harness exposed failure assertions in its log but its exit-hook behavior returned zero; the final harness explicitly exits after cleanup, and a negative control proves exit 1 on failure. Do not cite the old exit code as a pass.
- Publication, deployment, production migration, Sofia and UI remain outside this authorization.
