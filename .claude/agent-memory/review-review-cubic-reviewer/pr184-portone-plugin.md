---
name: pr184-portone-plugin
description: cubic review of PortOne payment plugin (PR #184, feat/portone-plugin); 2 issues found (P1 + P2) in SKILL.md
metadata:
  type: project
---

PR #184 adds a new PortOne payment plugin under `plugins/portone/`. Second cubic review pass (validating fixes from prior bot review rounds).

**Findings:**

- **P1** (`plugins/portone/skills/portone-guide/SKILL.md:263`): Warning note claims `express.raw()` at the route level "overrides" a globally installed `express.json()`. This is false in Express — a global `app.use(express.json())` placed before the route already consumes the body stream, so route-level `express.raw()` is ineffective. The fix is to instruct users to mount the webhook route before `app.use(express.json())`, not just add `express.raw()` inline.

- **P2** (`plugins/portone/skills/portone-guide/SKILL.md:173`): Import uses `import { PortOneClient } from "@portone/server-sdk"` but the package does NOT export `PortOneClient` as a named export (confirmed via npm dist type declarations at v0.19.0). The correct form is `import * as PortOne from "@portone/server-sdk"` + `PortOne.PortOneClient(...)`, which is what `payment-code-generator.md` already uses. This is a real bug.

**Why:** User requested fixes NOT be auto-applied — presented as actionable findings only.

**How to apply:** For future reviews of this plugin, watch for namespace-vs-named-export inconsistency in `@portone/server-sdk` (namespace import `import * as PortOne` is the correct pattern). Also note that Express middleware ordering for raw body parsing is a recurring gotcha in webhook docs.
