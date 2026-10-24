---
name: Expected 404 queries in route guards
description: Why a legitimate missing registration response can create a blank-page refetch loop in authenticated routes.
---

When an authenticated route treats a missing optional registration as an expected 404, keep one owner for that status query and pass its derived state down to layouts. Do not let a child layout mount a second observer for the same errored query while the parent hides the subtree during loading. Set `retryOnMount: false` for an expected-error query when other mounted consumers might observe it.

**Why:** An error with no cached data is not a successful stale result. Mounting another observer can fetch again even when normal retries are disabled; the parent then switches to its loading branch and unmounts that observer, causing a repeat cycle. The UI appears blank while requests flood the API.

**How to apply:** Check guarded routes where 404 means "legacy account" or "not registered yet." Prefer a single request at the guard, explicit loading/error states, and derived props for layouts. Check both desktop and mobile paths without changing legacy access rules.