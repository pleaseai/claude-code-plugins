---
name: pr181-graphite-please-config-opt-in
description: cubic review of PR #181 AWK YAML parser tightening in graphite-context.sh — clean pass (0 issues)
metadata:
  type: project
---

PR #181 (`feat/graphite-please-config-opt-in`) — cubic review of staged change to `plugins/graphite/hooks/graphite-context.sh`.

**Change:** Tightened AWK YAML parser so `enabled: true` is only matched when it appears as a direct child of the `graphite:` key (same indentation level as first child), not when nested deeper inside sub-keys.

**Why:** A prior AI review (cubic-dev-ai) flagged a false-positive match risk: deeply-nested `enabled: true` values under `graphite:` subtrees could incorrectly activate the graphite context hook.

**How to apply:** No further action required — cubic returned 0 issues. The indent-tracking logic (`child_indent`, `RLENGTH`, `match()`) is correct AWK idiom for depth-sensitive YAML parsing in a shell script.

**Result:** `cubic review -j` → `{"issues": []}` (clean pass).
