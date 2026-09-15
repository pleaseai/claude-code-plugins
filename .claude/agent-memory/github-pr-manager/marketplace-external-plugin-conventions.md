---
name: marketplace-external-plugin-conventions
description: Unwritten conventions for github-source (external) marketplace entries in pleaseai/claude-code-plugins — name must match upstream manifest, no submodule, no release-please entry
metadata:
  type: project
---

For `github:`-source entries in `.claude-plugin/marketplace.json` (as opposed to local `./plugins/...` entries), three conventions hold that are not written down in CLAUDE.md or `.claude/rules/marketplace-sync.md`:

1. **The marketplace entry name must match the upstream `.claude-plugin/plugin.json` `"name"`** — e.g. `gemini-cli-security` ← `pleaseai/security-plugin`, `dart-flutter` ← `flutter/agent-plugins`. Do not alias to a friendlier name even when it breaks existing installs; document the rename as a BREAKING CHANGE instead.
2. **No git submodule** is added for third-party upstreams that do not accept PRs (chrome-devtools-mcp, notion, cloudflare, modern-web-guidance, dart-flutter all follow this).
3. **No `release-please-config.json` / `.release-please-manifest.json` entry** — those companions apply only to local plugins.

**Why:** the name invariant keeps `/plugin install <name>@pleaseai` resolvable against what the upstream manifest declares; drift there breaks installs silently. Established in PR #274 (flutter → dart-flutter swap).

**How to apply:** when adding or swapping a github-source plugin, check upstream's manifest name first and surface any resulting install-name change prominently in the PR body. Skip the submodule and release-please steps that local plugins require.
