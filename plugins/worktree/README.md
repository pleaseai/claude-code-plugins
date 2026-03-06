# Worktree Plugin

Git worktree isolation for Claude Code: context injection and parent project access prevention.

## Overview

When Claude Code runs inside a git worktree, it can accidentally read or modify files from the parent project directory. This plugin prevents that by:

1. **Injecting context** at session start to inform Claude which path is the worktree and which is off-limits.
2. **Blocking file access** to the parent project path via a PreToolUse hook.

### How It Works

```text
Session starts
  │
  ▼
SessionStart: worktree-context.ts
  ├── Not a worktree → no-op
  └── Worktree detected → inject additionalContext
        "Use: /path/to/worktree  Do NOT access: /path/to/parent"
                                            │
                                            ▼
                              Claude Code tool call (Read/Edit/Grep/…)
                                            │
                                            ▼
                            PreToolUse: deny-parent-access.ts
                              ├── Path is safe → pass through
                              └── Path is under parent project → deny
```

### Worktree Detection

The hook uses two strategies:

| Strategy | Condition | How |
|----------|-----------|-----|
| Primary | Path contains `/.claude/worktrees/` | String match (Claude Code's `EnterWorktree` convention) |
| Fallback | Arbitrary `git worktree add` paths | `git rev-parse --show-toplevel` vs `--git-common-dir` |

### Scope

| Tool | Protected |
|------|-----------|
| Read | Yes |
| Edit / Write / MultiEdit | Yes |
| Grep / Glob | Yes |
| Bash | No (best-effort only) |

> **Note:** The hook provides best-effort isolation. It is not a complete security boundary. Bash commands are not intercepted.

## Installation

```sh
# Interactive (inside Claude Code session)
/plugin marketplace add pleaseai/claude-code-plugins
/plugin install worktree@pleaseai

# Direct (with optional scope: user | project | local)
claude plugin marketplace add pleaseai/claude-code-plugins --scope project
claude plugin install worktree@pleaseai --scope project
```

## Development

```bash
cd plugins/worktree
bun test
```

### Testing hooks manually

```bash
# SessionStart — worktree detected
echo '{"cwd":"/path/to/project/.claude/worktrees/my-branch"}' \
  | bun run hooks/worktree-context.ts

# PreToolUse — path denied (parent project access)
echo '{
  "tool_name": "Read",
  "tool_input": {"file_path": "/path/to/project/src/secret.ts"},
  "cwd": "/path/to/project/.claude/worktrees/my-branch"
}' | bun run hooks/deny-parent-access.ts

# PreToolUse — path allowed (worktree path)
echo '{
  "tool_name": "Read",
  "tool_input": {"file_path": "/path/to/project/.claude/worktrees/my-branch/src/safe.ts"},
  "cwd": "/path/to/project/.claude/worktrees/my-branch"
}' | bun run hooks/deny-parent-access.ts
```

## License

MIT
