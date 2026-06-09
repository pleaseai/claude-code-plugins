#!/usr/bin/env bash
# Re-sync this vendored plugin with an upstream microsoft/SkillOpt checkout.
#
# Usage:
#   scripts/sync-upstream.sh /path/to/SkillOpt
#
# Copies the upstream engine (`skillopt_sleep/`) and the Claude Code plugin
# assets (command, skill, hook, cron helper, LICENSE) into this plugin, then
# prints a summary so the version bump can be reviewed before commit.
#
# NOTE: it deliberately does NOT overwrite `scripts/sleep.sh` — our runner is a
# self-contained variant (no shared run-sleep.sh, no repo lookup) that differs
# from upstream on purpose.
set -euo pipefail

UPSTREAM="${1:-}"
if [ -z "$UPSTREAM" ] || [ ! -d "$UPSTREAM/skillopt_sleep" ]; then
  echo "usage: $0 /path/to/SkillOpt   (a clone of microsoft/SkillOpt)" >&2
  exit 1
fi
UPSTREAM="$(cd "$UPSTREAM" && pwd)"

# Plugin root = parent of this scripts/ dir.
PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CC="$UPSTREAM/plugins/claude-code"   # upstream Claude Code plugin assets

echo "[sync] upstream : $UPSTREAM"
echo "[sync] plugin   : $PLUGIN_ROOT"

# 1) Engine package (pure stdlib; strip caches).
rsync -a --delete \
  --exclude='__pycache__' --exclude='*.pyc' \
  "$UPSTREAM/skillopt_sleep/" "$PLUGIN_ROOT/skillopt_sleep/"

# 2) Static plugin assets (everything EXCEPT scripts/sleep.sh).
cp "$CC/commands/sleep.md"                    "$PLUGIN_ROOT/commands/sleep.md"
cp "$CC/hooks/hooks.json"                     "$PLUGIN_ROOT/hooks/hooks.json"
cp "$CC/hooks/on-session-end.sh"              "$PLUGIN_ROOT/hooks/on-session-end.sh"
cp "$CC/skills/skillopt-sleep/SKILL.md"       "$PLUGIN_ROOT/.agents/skills/skillopt-sleep/SKILL.md"
cp "$CC/scripts/install-cron.sh"              "$PLUGIN_ROOT/scripts/install-cron.sh"
cp "$UPSTREAM/LICENSE"                         "$PLUGIN_ROOT/LICENSE"

chmod +x "$PLUGIN_ROOT/scripts/install-cron.sh" "$PLUGIN_ROOT/hooks/on-session-end.sh"

echo "[sync] done. Review changes:"
if command -v git >/dev/null 2>&1 && git -C "$PLUGIN_ROOT" rev-parse >/dev/null 2>&1; then
  git -C "$PLUGIN_ROOT" status --short -- . || true
  echo "[sync] reminder: bump 'version' in .claude-plugin/plugin.json and CHANGELOG.md,"
  echo "       then regenerate derived manifests (Codex/Antigravity) via the repo's multi-format tool."
fi
