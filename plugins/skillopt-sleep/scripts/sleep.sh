#!/usr/bin/env bash
# SkillOpt-Sleep runner — self-contained.
#
# The engine (the `skillopt_sleep` Python package) is vendored INSIDE this
# plugin, right next to this script's parent dir, so there is no dependency on
# a cloned repo or a shared runner. The package is pure standard library
# (Python >= 3.10), so no venv/pip install is needed: we just put the plugin
# root on PYTHONPATH and run `python -m skillopt_sleep`.
#
# Usage: sleep.sh <run|dry-run|status|adopt|harvest|...> [args...]
set -euo pipefail

# Plugin root = the dir that contains the vendored `skillopt_sleep/` package.
# CLAUDE_PLUGIN_ROOT is set by Claude Code; fall back to this script's parent.
ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

if [ ! -d "$ROOT/skillopt_sleep" ]; then
  echo "[sleep] ERROR: vendored skillopt_sleep package not found under '$ROOT'." >&2
  exit 1
fi

if [ "$#" -eq 0 ]; then set -- status; fi

# Prefer a system Python >= 3.10; otherwise fall back to uv, which can fetch a
# suitable interpreter on demand. The package has zero third-party deps, so uv
# runs it with --no-project and no --with.
if python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' 2>/dev/null; then
  exec env PYTHONPATH="$ROOT" python3 -m skillopt_sleep "$@"
elif command -v uv >/dev/null 2>&1; then
  exec env PYTHONPATH="$ROOT" uv run --python 3.12 --no-project python -m skillopt_sleep "$@"
else
  echo "[sleep] ERROR: need Python >= 3.10 (or 'uv') on PATH." >&2
  exit 1
fi
