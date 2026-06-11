---
name: RTK Token Optimization
description: RTK (Rust Token Killer) reduces LLM token consumption by 60-90% by filtering and compressing command outputs. Use when user asks about token savings, token optimization, RTK usage, `rtk gain`, `rtk discover`, or `rtk proxy`. Triggers on mentions of token reduction, RTK commands, or checking command cost.
---

# RTK Token Optimization

RTK is a high-performance CLI proxy written in Rust. It intercepts commands like `git status`, `npm install`, etc., and rewrites their output to be dramatically more token-efficient.

## Meta Commands (always use rtk directly)

```bash
rtk gain              # Show token savings analytics
rtk gain --history    # Show command usage history with savings
rtk discover          # Analyze Claude Code history for missed opportunities
rtk proxy <cmd>       # Execute raw command without filtering (for debugging)
```

### Run a specific command with RTK rewriting
```bash
rtk <command> [args...]
# Example: rtk git status
# Example: rtk npm test
```

## Installation

```bash
# Quick install (Linux/macOS)
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/master/install.sh | sh

# macOS/Linux via Homebrew
brew install rtk-ai/tap/rtk

# Or via cargo (use the explicit Git URL — plain `cargo install rtk`
# may install the wrong package due to a name collision)
cargo install --git https://github.com/rtk-ai/rtk rtk
```

## Installation Verification

```bash
rtk --version         # Should show: rtk X.Y.Z
rtk gain              # Should work (not "command not found")
which rtk             # Verify correct binary
```

⚠️ **Name collision**: If `rtk gain` fails, you may have reachingforthejack/rtk (Rust Type Kit) installed instead.

## Initialization

This plugin already installs the Claude Code hook — no `rtk init` needed.

- `rtk init --global` patches `~/.claude/settings.json` with a `rtk hook claude` PreToolUse entry — the non-plugin alternative to this plugin. Don't combine them: the hook would fire twice (redundant, not harmful).
- `rtk init` (per-project) installs no hook — it only injects RTK instructions into the project `CLAUDE.md` and creates a `.rtk/filters.toml` filter template.

## How the Plugin Works

When installed as a Claude Code plugin, RTK's `PreToolUse` hook intercepts every `Bash` tool call and rewrites commands through `rtk rewrite` before execution. This is transparent to Claude — commands run normally but produce compressed, token-efficient output. All rewrite and permission logic lives in the `rtk rewrite` binary (deny rules pass through to Claude Code's native handling; ask rules rewrite but still prompt the user).

## Configuration

Config file: `~/.config/rtk/config.toml` (Linux) or `~/Library/Application Support/rtk/config.toml` (macOS). View with `rtk config`, create with `rtk config --create`.

```toml
# Exclude commands from auto-rewriting (prefix, subcommand, or ^regex)
[hooks]
exclude_commands = ["git rebase", "docker exec"]
```

- `RTK_DISABLED=1 <command>` — disable RTK for a single invocation
- `RTK_HOOK_AUDIT=1` — enable hook audit logging
- Per-project overrides: `.rtk/filters.toml` in the project root

## Requirements

- RTK >= 0.23.0
- `jq` (for JSON parsing in the hook script)
- If either is missing, the hook warns once on stderr and passes through — safe to install without RTK

## Token Savings Examples

| Command | Raw tokens | RTK tokens | Savings |
|---------|-----------|------------|---------|
| `git status` | ~800 | ~50 | 94% |
| `npm install` | ~2000 | ~200 | 90% |
| `ls -la` | ~400 | ~80 | 80% |
