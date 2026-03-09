---
name: RTK Token Optimization
description: RTK (Rust Token Killer) reduces LLM token consumption by 60-90% by filtering and compressing command outputs. Use when user asks about token savings, token optimization, RTK usage, `rtk gain`, `rtk discover`, or `rtk proxy`. Triggers on mentions of token reduction, RTK commands, or checking command cost.
---

# RTK Token Optimization

RTK is a high-performance CLI proxy written in Rust. It intercepts commands like `git status`, `npm install`, etc., and rewrites their output to be dramatically more token-efficient.

## Key Meta-Commands

### Check token savings for a command
```bash
rtk gain <command>
# Example: rtk gain git status
# Shows how many tokens are saved vs raw output
```

### Discover which commands RTK can optimize
```bash
rtk discover
# Lists all commands RTK knows how to compress
```

### Run a command through the RTK proxy manually
```bash
rtk proxy <command>
# Example: rtk proxy npm install
# Runs the command and filters its output
```

### Run a specific command with RTK rewriting
```bash
rtk <command> [args...]
# Example: rtk git status
# Example: rtk npm test
```

## Installation

```bash
# macOS/Linux via Homebrew
brew install rtk-ai/tap/rtk

# Or via cargo
cargo install rtk
```

## Initialization (sets up shell hooks globally)

```bash
rtk init -g
# Or install as a Claude Code plugin instead:
# /plugin install rtk@pleaseai
```

## How the Plugin Works

When installed as a Claude Code plugin, RTK's `PreToolUse` hook intercepts every `Bash` tool call and rewrites commands through `rtk rewrite` before execution. This is transparent to Claude — commands run normally but produce compressed, token-efficient output.

## Requirements

- RTK >= 0.23.0
- `jq` (for JSON parsing in the hook script)
- If either is missing, the hook silently passes through — safe to install without RTK

## Token Savings Examples

| Command | Raw tokens | RTK tokens | Savings |
|---------|-----------|------------|---------|
| `git status` | ~800 | ~50 | 94% |
| `npm install` | ~2000 | ~200 | 90% |
| `ls -la` | ~400 | ~80 | 80% |
