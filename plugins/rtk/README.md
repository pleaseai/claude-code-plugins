# RTK Plugin for Claude Code

Reduce LLM token consumption by 60-90% using [RTK (Rust Token Killer)](https://github.com/rtk-ai/rtk) to filter and compress command outputs.

RTK is a high-performance CLI proxy written in Rust. It intercepts commands like `git status`, `npm install`, and many others, rewriting their output to be dramatically more token-efficient — without changing the information content.

## How It Works

This plugin installs a `PreToolUse` hook on the `Bash` tool. Every time Claude runs a shell command, the hook checks whether RTK can rewrite it to produce more compact output. The rewrite is transparent: the command runs normally, but produces compressed output.

All rewrite and permission logic lives in the `rtk rewrite` binary — its exit codes tell the hook what to do:

| Exit code | Meaning | Hook behavior |
|-----------|---------|---------------|
| 0 | Rewrite found, no deny/ask rule matched | Rewrite and auto-allow |
| 1 | No RTK equivalent | Pass through unchanged |
| 2 | Deny rule matched | Pass through (Claude Code's native deny handles it) |
| 3 | Ask rule matched | Rewrite, but let Claude Code prompt the user |

The hook gracefully no-ops (with a stderr warning) if:
- RTK is not installed
- RTK version is below 0.23.0
- `jq` is not available
- The command has no RTK rewrite available

## Prerequisites

- **RTK >= 0.23.0** — Install via the quick-install script, Homebrew, or Cargo:
  ```bash
  # Quick install (Linux/macOS)
  curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/master/install.sh | sh

  # Homebrew (macOS/Linux)
  brew install rtk-ai/tap/rtk

  # Cargo — use the explicit Git URL; plain `cargo install rtk` may install
  # the wrong package (name collision with Rust Type Kit)
  cargo install --git https://github.com/rtk-ai/rtk rtk
  ```
- **jq** — usually pre-installed; `brew install jq` or `apt install jq`

## Installation

```sh
claude
/plugin marketplace add pleaseai/claude-code-plugins
/plugin install rtk@pleaseai
```

## Verification

After installation, verify RTK is working:

```bash
# Check RTK version (should show: rtk X.Y.Z)
rtk --version

# Show token savings analytics (should work — if it fails, you may have
# the unrelated reachingforthejack/rtk "Rust Type Kit" installed instead)
rtk gain

# Analyze Claude Code history for missed optimization opportunities
rtk discover
```

> **Note**: Do **not** run `rtk init` when using this plugin. `rtk init` (per-project) and `rtk init --global` (system-wide) install the same Claude Code hook directly into your settings — this plugin already provides it. Running both would register the hook twice. Choose one: this plugin *or* `rtk init`.

## Manual Usage (without the plugin)

You can also use RTK directly without the plugin hook:

```bash
# Run any command through RTK
rtk git status
rtk npm install
rtk proxy <any-command>

# Set up Claude Code hooks without this plugin (alternative)
rtk init           # per-project
rtk init --global  # system-wide
```

## Notes

- The plugin is safe to install even without RTK — the hook exits silently if RTK is not found
- RTK's own `rtk rewrite` command contains all rewrite logic; this plugin is a thin delegator
- For more details on RTK's capabilities, run `rtk discover` or visit the [RTK repository](https://github.com/rtk-ai/rtk)
