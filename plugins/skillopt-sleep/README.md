# skillopt-sleep

Give your local Claude agent a nightly **sleep cycle**: it reviews your past
Claude Code sessions offline, replays your recurring tasks on your own API
budget, and consolidates what it learns into **validated** long-term memory
(`CLAUDE.md`) and skills (`SKILL.md`) — behind a held-out gate, staged for your
review. Your agent gets better the more you use it, with no model-weight
training.

It synthesizes three ideas: **SkillOpt** (validation-gated bounded text
optimization), **Claude Dreams** (offline memory consolidation; input never
mutated; review-then-adopt), and the **agent sleep** literature (short-term
experience → long-term competence).

## Install

```text
/plugin marketplace add pleaseai/claude-code-plugins
/plugin install skillopt-sleep@pleaseai
/sleep status
```

## Usage

Drive it with the `/sleep` command (default action: `status`):

| action    | what it does |
|-----------|--------------|
| `status`  | how many nights have run + the latest staged proposal (READ-ONLY) |
| `dry-run` | harvest → mine → replay → report, but **stage nothing** (safe preview) |
| `run`     | full cycle: also **stage** a reviewed proposal (does NOT touch live files) |
| `adopt`   | apply the latest staged proposal to live `CLAUDE.md` / `SKILL.md` (backs up first) |
| `harvest` | debug: print the recurring tasks mined from recent sessions |

Default backend is `mock` (deterministic, no API spend). Add `--backend claude`
(or `--backend codex`) to spend real budget for genuine improvement. Nothing
live changes until you run `/sleep adopt`.

To schedule it nightly, run `${CLAUDE_PLUGIN_ROOT}/scripts/install-cron.sh`,
which **prints** a crontab line (installs nothing automatically).

## Requirements

- Python ≥ 3.10 on `PATH` (or [`uv`](https://docs.astral.sh/uv/), which the
  runner uses as a fallback to fetch a suitable interpreter).
- No third-party Python packages — the engine is pure standard library.

## How it works

The engine is the [`skillopt_sleep`](./skillopt_sleep) Python package, **vendored
inside this plugin** so the plugin is fully self-contained: a marketplace
install ships the engine with it, and `scripts/sleep.sh` runs it via
`PYTHONPATH="${CLAUDE_PLUGIN_ROOT}" python -m skillopt_sleep`. No clone, no
`pip install`, no virtualenv.

## Provenance & updating the vendored engine

This plugin vendors the upstream engine from
[`microsoft/SkillOpt`](https://github.com/microsoft/SkillOpt) (`plugins/claude-code`
plus the top-level `skillopt_sleep/` package). Upstream is MIT-licensed; the
original `LICENSE` is kept alongside the vendored code.

To re-sync the vendored copy with a newer upstream:

```bash
scripts/sync-upstream.sh /path/to/SkillOpt   # local clone of microsoft/SkillOpt
```

The script copies `skillopt_sleep/` and the Claude Code plugin assets, refreshes
the runner, and reports what changed so the bump can be reviewed before commit.

## License

MIT © Microsoft Corporation (upstream `skillopt_sleep` engine). See
[`LICENSE`](./LICENSE).
