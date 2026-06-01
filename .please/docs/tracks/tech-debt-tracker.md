# Tech Debt Tracker

> Tracked across all tracks. Updated during implementation and retrospectives.

## Active

| ID | Source Track | Description | Priority | Created |
|----|------------|-------------|----------|---------|
| TD-001 | awesome-copilot-java-20260528 | `bun scripts/cli.ts multi-format` rewrites ALL plugin manifests instead of accepting a `--only <plugin>` filter; forces manual reversion when adding a single plugin | Low | 2026-05-28 |
| TD-002 | awesome-copilot-java-20260528 | 93 plugins have stale Codex/Antigravity manifests vs Claude source — needs a dedicated `chore(multi-format): re-sync stale runtime manifests` track | Medium | 2026-05-28 |
| TD-003 | awesome-copilot-java-20260528 | `.claude-plugin/marketplace.json` schema warns on `homepage` and `repository` fields — pre-existing, needs schema reconciliation | Low | 2026-05-28 |
| TD-004 | awesome-copilot-java-20260528 | No automated upstream-sync for `plugins/java-development/` — manual re-copy required when upstream changes | Low | 2026-05-28 |

## Resolved

| ID | Source Track | Description | Resolved In | Date |
|----|------------|-------------|-------------|------|
