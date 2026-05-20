---
description: Rebase the current branch (and its dependents) onto a new parent (gt move)
allowed-tools: Bash, Read
argument-hint: [--onto <branch> | --only]
---

Re-parent the current branch onto a different branch and bring its descendants along. User input: `$ARGUMENTS`.

## Steps

1. Run `gt ls` to show the current shape.
2. Determine the target parent:
   - If `$ARGUMENTS` includes `--onto <branch>` or just a branch name, use that.
   - Otherwise, run `gt move` to open the interactive parent picker. If the session is non-interactive, ask the user for the target branch.
3. Run `gt move --onto <target-branch>`.
4. Graphite rebases the current branch onto the target and restacks everything upstack of it. Resolve conflicts the usual way: `gt add .` → `gt continue -a`, or `gt abort`.
5. Run `gt ls` to confirm the new structure.

## Key flags

- `-o, --onto <branch>` — target parent (skips interactive picker)
- `--only` — move just this branch; do not bring children along

## When to use vs reorder

- Single branch + clear new parent → `gt move --onto`.
- Multiple branches need shuffling → `/graphite:reorder` (editor-based).
- Just inserting a new branch → `/graphite:create` with `--insert`.
