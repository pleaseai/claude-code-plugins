---
description: Break the current branch into multiple branches (gt split)
allowed-tools: Bash, Read
argument-hint: [--by-commit | --by-file "<pathspec>" | --by-hunk]
---

Divide the current branch into a stack of smaller branches. User input: `$ARGUMENTS`.

## Modes

- `gt split --by-commit` (`-c`) — split along existing commit boundaries. Each commit becomes its own branch. Only useful on a multi-commit branch.
- `gt split --by-file "<pathspec>"` (`-f`) — peel off files matching the pathspec onto a new branch. Repeat `-f` for multiple patterns: `gt split -f "*.json" -f "*.yaml"`.
- `gt split --by-hunk` (`-h`) — interactive `git add --patch`-style hunk selection.

## Steps

1. Run `gt ls` and `git log --oneline <trunk>..` so the user sees what's on the branch today.
2. Decide the mode:
   - Multiple commits already, clean per-commit grouping → `--by-commit`.
   - Mixed files, easy to separate by path → `--by-file`.
   - Same files but distinct concerns → `--by-hunk`.
3. Run `gt split <mode>`.
4. **Preserve the original branch name on one of the pieces** if it already has a PR — GitHub PR branch names are immutable. Tell the user when this matters; Graphite usually prompts.
5. After the split, run `gt ls` and consider `gt submit --stack` to open PRs for the new branches.

## Notes

- After splitting, the auto-restack runs for everything above the split point. Resolve conflicts the usual way.
- If the user wants the *opposite* (combine branches), use `/graphite:fold` (into parent) or `/graphite:squash` (commits within one branch).
