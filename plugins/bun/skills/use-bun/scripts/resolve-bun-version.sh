#!/usr/bin/env bash
# Resolve the project's Bun version in order of authority:
#   1. .bun-version                                — explicit project pin
#   2. package.json "packageManager": "bun@X.Y.Z"  — corepack-style pin
#   3. package.json "engines": { "bun": "..." }    — engine constraint (first matching version)
#   4. global bun on PATH (bun --version)          — runtime fallback
#
# Prints the version without a prefix (e.g. "1.3.14"). The skill prepends
# the "bun-v" prefix that matches GitHub release tags before passing to `ask`
# (e.g. ask src "github:oven-sh/bun@bun-v1.3.14"). Plain "vX.Y.Z" tags do not
# exist for Bun — they return HTTP 404.
#
# Exits 0 with stdout when a version is found, 1 otherwise.
#
# Usage:
#   BUN_REF="bun-v$(${CLAUDE_SKILL_DIR}/scripts/resolve-bun-version.sh)" || exit 1

set -euo pipefail

if [ -f .bun-version ]; then
  tr -d '[:space:]' < .bun-version
  exit 0
fi

if [ -f package.json ] && command -v jq >/dev/null 2>&1; then
  ver=$(jq -r '
    if (.packageManager // "") | startswith("bun@") then
      .packageManager | sub("^bun@"; "")
    elif (.engines.bun // "") | length > 0 then
      .engines.bun | sub("^[^0-9]*"; "") | split("[ ,]+"; "") | .[0]
    else
      empty
    end
  ' package.json 2>/dev/null)
  if [ -n "${ver:-}" ] && [ "$ver" != "null" ]; then
    printf '%s' "$ver"
    exit 0
  fi
fi

if command -v bun >/dev/null 2>&1; then
  bun --version
  exit 0
fi

echo "resolve-bun-version: no version found (.bun-version, package.json, or bun on PATH)" >&2
exit 1
