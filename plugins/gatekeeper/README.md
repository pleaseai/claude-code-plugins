# Gatekeeper Plugin

Two-layer security for Claude Code: auto-approve safe commands, AI-assisted review for the rest.

## Overview

Gatekeeper eliminates repetitive permission dialogs for safe development commands while maintaining security against destructive operations.

### How It Works

```
Bash command
  │
  ▼
Layer 1: PreToolUse (pattern matching, <5ms)
  ├── ALLOW: safe patterns (npm, git, node, etc.) → skip permission dialog
  ├── DENY: destructive patterns (rm -rf /, mkfs, etc.) → block immediately
  └── PASSTHROUGH: unknown commands → permission dialog
                                          │
                                          ▼
                                Layer 2: PermissionRequest (AI agent, opus)
                                  ├── approve → execute
                                  └── reject → block with reason
```

## Allowed Patterns

| Category | Examples |
|----------|----------|
| Package managers | `npm test`, `bun install`, `yarn add`, `pnpm run` |
| Git read | `git status`, `git log`, `git diff`, `git branch` |
| Git write | `git add`, `git commit`, `git merge`, `git pull` |
| Git push | `git push` (non-force only) |
| Build/runtime | `node`, `npx`, `tsx`, `python`, `cargo build`, `make` |
| File inspection | `ls`, `cat`, `grep`, `find`, `tree`, `wc` |
| Docker read | `docker ps`, `docker logs`, `docker images` |

## Denied Patterns

| Pattern | Reason |
|---------|--------|
| `rm -rf /` | Filesystem root deletion |
| `rm -rf /*` | Destructive wildcard deletion from root |
| `rm -rf ~` | Home directory deletion |
| `mkfs.*` | Disk format |
| `dd if=/dev/zero of=/dev/` | Disk zeroing |

## Installation

```sh
claude
/plugin marketplace add pleaseai/claude-code-plugins
/plugin install gatekeeper@pleaseai
```

## Development

```bash
cd plugins/gatekeeper
bun install
bun run build
```

### Testing

```bash
# ALLOW test
echo '{"tool_name":"Bash","tool_input":{"command":"npm test"}}' | node dist/pre-tool-use.js

# DENY test
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"}}' | node dist/pre-tool-use.js

# PASSTHROUGH test (no output)
echo '{"tool_name":"Bash","tool_input":{"command":"curl https://example.com"}}' | node dist/pre-tool-use.js
```

## References

- [Claude Code Tips: PermissionRequest Hook Pattern](https://www.threads.com/@boris_cherny/post/DUMZy85EoFj)

## License

MIT
