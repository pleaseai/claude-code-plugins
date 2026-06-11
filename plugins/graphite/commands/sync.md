---
description: Pull trunk, delete merged branches, restack the stack (gt sync)
allowed-tools: Bash, Read
argument-hint: [--all | --force]
---

Sync the local repository with `origin`. `gt sync` pulls trunk, prompts to delete branches that have been merged into trunk, and restacks the remaining stack onto the new trunk tip. User input: `$ARGUMENTS`.

## Steps

1. Run `git status --short` to ensure the working tree is clean. If not, ask whether to commit/stash before syncing.
2. Run `gt ls` to capture the stack shape before sync.
3. Run `gt sync $ARGUMENTS` (respecting any flags the user passed).
4. If the output reports conflicts on specific branches:
   - List the conflicted branches to the user.
   - For each, `gt co <branch>` → `gt restack` → resolve in editor → `gt add .` → `gt continue -a`.
   - If a restack should be aborted, run `gt abort` and report.
5. Run `gt ls` again so the user sees the new state and which merged branches were pruned.

## Key flags

- `-a, --all` — sync every trunk (when multiple trunks are configured)
- `-d, --delete-all` — delete merged branches without prompting
- `-f, --force` — accept all destructive prompts

## When to use vs `git pull`

Always prefer `gt sync` in a Graphite-tracked repo. Plain `git pull` won't restack downstream branches and can leave stacks pointing at the old trunk tip, which then requires a manual `gt restack`.
