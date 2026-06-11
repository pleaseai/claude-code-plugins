# Gatekeeper Plugin

Three-tier security for Claude Code: auto-approve safe commands, block destructive ones, and AI-review everything in between — across all tools.

## Overview

Gatekeeper eliminates repetitive permission dialogs for safe development commands while maintaining security against destructive operations. It covers **all Claude Code tools** (Bash, Write, Edit, WebFetch, and more), not just shell commands.

### How It Works

```text
Any tool call (Bash, Write, Edit, WebFetch, Read, etc.)
  │
  ▼
Layer 1: PreToolUse (pattern matching, <5ms)
  ├── HARD DENY: destructive patterns → block immediately
  ├── SOFT DENY: risky but sometimes intended → passthrough to AI
  ├── ALLOW: safe patterns → skip permission dialog
  └── UNKNOWN: no matching rule → passthrough to AI
                                      │
                                      ▼
                                Layer 2: PermissionRequest (AI agent, haiku)
                                  ├── "Did user explicitly request this?"
                                  │   ├── Yes → allow
                                  │   └── No  → deny with reason
                                  └── Unsure → user sees permission prompt
```

### Decision Types

| Decision | Hook Output | Effect |
|----------|------------|--------|
| **Hard Deny** | `{ permissionDecision: "deny" }` | Tool blocked immediately, stderr message |
| **Soft Deny** | `null` (passthrough) | Proceeds to AI review in PermissionRequest |
| **Allow** | `{ permissionDecision: "allow" }` | Tool executes, permission dialog skipped |
| **Unknown** | `null` (passthrough) | Proceeds to AI review (fail-open) |

## Tool Coverage

### Bash Commands

#### Hard Deny (absolute blocks)

| Pattern | Reason |
|---------|--------|
| `rm -rf /` | Filesystem root deletion |
| `rm -rf /*` | Destructive wildcard deletion from root |
| `rm -rf ~` | Home directory deletion |
| `mkfs.*` | Disk format |
| `dd if=/dev/zero of=/dev/` | Disk zeroing |
| `node -e`, `python -c`, etc. | Inline interpreter code execution |
| `find -exec/-execdir/-delete` | Arbitrary command execution |

#### Soft Deny (AI reviews intent)

| Pattern | Reason |
|---------|--------|
| `git push --force` | Force push needs user intent verification |
| `git push origin main` | Push to default branch needs user intent verification |
| `git reset --hard` | Hard reset needs user intent verification |
| `git clean -f` | Git clean needs user intent verification |
| `git branch -D` | Force branch delete needs user intent verification |
| `npm publish` | Package publish needs user intent verification |
| `terraform apply/destroy` | Infrastructure change needs user intent verification |
| `kubectl apply/delete` | Kubernetes mutation needs user intent verification |
| `git commit --no-verify` | Skipping commit verification needs user intent verification |
| `chmod 777` | Broad permission change needs user intent verification |
| `nc -l`, `python -m http.server` | Exposing local service needs user intent verification |
| `crontab`, `systemctl enable` | Unauthorized persistence needs user intent verification |
| IAM/RBAC commands | Permission grant needs user intent verification |

#### Allowed (instant approve)

| Category | Examples |
|----------|----------|
| Package managers | `npm test`, `bun install`, `yarn add`, `pnpm run` |
| Git read | `git status`, `git log`, `git diff`, `git branch` |
| Git write | `git add`, `git commit`, `git merge`, `git pull` |
| Git push | `git push` (non-force, non-main) |
| Build/runtime | `node`, `npx`, `tsx`, `python`, `cargo build`, `make` |
| File inspection | `ls`, `cat`, `grep`, `find`, `tree`, `wc` |
| Docker read | `docker ps`, `docker logs`, `docker images` |

### Write/Edit

| Decision | Pattern | Reason |
|----------|---------|--------|
| Soft Deny | `.env`, `.env.*` | Secrets file |
| Soft Deny | `.claude/settings` | Agent self-modification |
| Soft Deny | `CLAUDE.md` | Agent self-modification |
| Soft Deny | `.github/workflows/*` | CI/CD config |
| Soft Deny | `.gitlab-ci.yml`, `Jenkinsfile`, `.circleci/*` | CI/CD config |
| Allow | Project-relative paths | Safe project file |
| Passthrough | Absolute paths outside project | AI review |

### WebFetch

| Decision | Pattern | Reason |
|----------|---------|--------|
| Soft Deny | Paste services (pastebin, hastebin, etc.) | Data exfiltration risk |
| Soft Deny | File sharing (transfer.sh, file.io, etc.) | Data exfiltration risk |
| Soft Deny | Script downloads (`.sh`, `.bash`, `.ps1`) | Code execution risk |
| Allow | `localhost`, `127.0.0.1` | Safe dev server |
| Passthrough | Other URLs | AI review |

### Safe Tools (instant allow)

Read, Glob, Grep, LS, Search, TaskCreate, TaskUpdate, TaskList, TaskGet, TodoRead, TodoWrite, NotebookRead

### Unknown Tools

All unrecognized tools pass through to the AI review layer (fail-open design).

## AI Review (Layer 2)

The PermissionRequest hook uses an AI agent (haiku model) with rules derived from [Claude Code's auto-mode classifier](https://www.anthropic.com/engineering/claude-code-auto-mode):

**Core principle**: "Did the user explicitly request this action?"

The AI prompt covers 7 ALLOW rules and 25+ DENY rules including:
- Data exfiltration and credential exposure
- Supply chain attacks and untrusted code integration
- Infrastructure mutations and production access
- Agent self-modification and unauthorized persistence
- External system writes and content fabrication

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
bun test

# Manual tests:

# HARD DENY test
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"}}' | node dist/pre-tool-use.js

# SOFT DENY test (no output = passthrough to AI)
echo '{"tool_name":"Bash","tool_input":{"command":"git push --force"}}' | node dist/pre-tool-use.js

# ALLOW test
echo '{"tool_name":"Bash","tool_input":{"command":"npm test"}}' | node dist/pre-tool-use.js

# Safe tool ALLOW test
echo '{"tool_name":"Read","tool_input":{"file_path":"test.ts"}}' | node dist/pre-tool-use.js

# Write soft deny test (no output = passthrough to AI)
echo '{"tool_name":"Write","tool_input":{"file_path":".env"}}' | node dist/pre-tool-use.js

# PASSTHROUGH test (unknown tool, no output)
echo '{"tool_name":"Agent","tool_input":{}}' | node dist/pre-tool-use.js
```

## References

- [Anthropic: Claude Code Auto Mode](https://www.anthropic.com/engineering/claude-code-auto-mode)
- [Anthropic: Claude Code Sandboxing](https://www.anthropic.com/engineering/claude-code-sandboxing)
- [Claude Code Hooks Documentation](https://code.claude.com/docs/en/hooks)

## License

MIT
