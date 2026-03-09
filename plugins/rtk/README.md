# RTK Plugin for Claude Code

Reduce LLM token consumption by 60-90% using [RTK (Rust Token Killer)](https://github.com/rtk-ai/rtk) to filter and compress command outputs.

RTK is a high-performance CLI proxy written in Rust. It intercepts commands like `git status`, `npm install`, and many others, rewriting their output to be dramatically more token-efficient — without changing the information content.

## How It Works

This plugin installs a `PreToolUse` hook on the `Bash` tool. Every time Claude runs a shell command, the hook checks whether RTK can rewrite it to produce more compact output. The rewrite is transparent: the command runs normally, but produces compressed output.

The hook gracefully no-ops if:
- RTK is not installed
- RTK version is below 0.23.0
- `jq` is not available
- The command has no RTK rewrite available

## Prerequisites

- **RTK >= 0.23.0** — Install via Homebrew or Cargo:
  ```bash
  brew install rtk-ai/tap/rtk
  # or
  cargo install rtk
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
# Check RTK version
rtk --version

# See token savings for a command
rtk gain git status

# Discover which commands RTK can optimize
rtk discover
```

## Manual Usage (without the plugin)

You can also use RTK directly without the plugin hook:

```bash
# Run any command through RTK
rtk git status
rtk npm install
rtk proxy <any-command>

# Set up shell hooks globally (alternative to this plugin)
rtk init -g
```

## Notes

- The plugin is safe to install even without RTK — the hook exits silently if RTK is not found
- RTK's own `rtk rewrite` command contains all rewrite logic; this plugin is a thin delegator
- For more details on RTK's capabilities, run `rtk discover` or visit the [RTK repository](https://github.com/rtk-ai/rtk)
