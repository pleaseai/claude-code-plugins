---
name: pr184-portone-plugin
description: cubic review of PortOne payment plugin (PR #184, feat/portone-plugin); 2 issues found (P1 + P2) in SKILL.md
metadata:
  type: project
---

PR #184 adds a new PortOne payment plugin under `plugins/portone/`. Second cubic review pass (validating fixes from prior bot review rounds).

**Findings:**

- **P1** (`plugins/portone/skills/portone-guide/SKILL.md:263`): Warning note claims `express.raw()` at the route level "overrides" a globally installed `express.json()`. This is false in Express — a global `app.use(express.json())` placed before the route already consumes the body stream, so route-level `express.raw()` is ineffective. The fix is to instruct users to mount the webhook route before `app.use(express.json())`, not just add `express.raw()` inline.

- **P2** (`plugins/portone/skills/portone-guide/SKILL.md:173`) — **CORRECTION**: this finding was wrong. `PortOneClient` IS a valid named export from `@portone/server-sdk@0.19.0`. The package's `index.d.ts` only directly exports `PortOneClientInit`, `PortOneError`, and `Webhook`, BUT it also has `export * from "./generated/index.js"`, and `generated/index.d.ts` contains `export { PortOneClient } from "./client.js"`. So `import { PortOneClient } from "@portone/server-sdk"` works (the README uses exactly this form). The local reviewer missed the transitive re-export when reading only the top-level `index.d.ts`. Both `import { PortOneClient }` and `import * as PortOne` + `PortOne.PortOneClient(...)` are correct; we kept the namespace form in SKILL.md for stylistic parity with `payment-code-generator.md`.

**Why:** User requested fixes NOT be auto-applied — presented as actionable findings only.

**How to apply:** For future reviews, always check `export *` re-exports before claiming a symbol isn't exported. When verifying SDK surfaces, prefer fetching the README's import examples + the deepest re-export chain (here: `generated/index.d.ts → client.d.ts`) over scanning only the top-level `index.d.ts`. Express middleware ordering for raw body parsing remains a recurring gotcha in webhook docs.
