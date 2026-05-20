---
description: Create a new stacked branch from the current changes (gt create)
allowed-tools: Bash, Read, Grep
argument-hint: [branch-name or commit message]
---

Create a new Graphite-tracked branch on top of the current branch, carrying the working-tree changes as a single commit. User input: `$ARGUMENTS`.

## Steps

1. Run `git status --short` to confirm there are changes to commit. If the tree is clean, ask the user whether they meant to run `gt create --onto <branch>` (create empty branch on top of another).
2. Run `gt ls` to show the current stack so the user can confirm where the new branch lands.
3. Build the command:
   - If `$ARGUMENTS` looks like a commit message (contains spaces or `:`), use `gt create -am "$ARGUMENTS"` — Graphite derives the branch name from the message.
   - If `$ARGUMENTS` is a single token, treat it as a branch name: `gt create -am "..." $ARGUMENTS`. Ask the user for a commit message if one wasn't provided.
   - If `$ARGUMENTS` is empty, ask the user for a commit message (or branch name) before proceeding.
4. Run the command and report the new branch and updated `gt ls`.

## Key flags

- `-a, --all` — stage every modified file (default for this command)
- `-m, --message <msg>` — commit message (and source of the auto-generated branch name)
- `-p, --patch` — interactive hunk staging instead of `-a`
- `--insert` — insert this branch between the current branch and its children, restacking dependents
- `--onto <branch>` — create on top of a different branch (useful with worktrees)
- `--ai` — let Graphite suggest a branch name / message
