---
description: Amend or add a commit on the current branch and auto-restack upstack (gt modify)
allowed-tools: Bash, Read
argument-hint: [-c for new commit | -m "message" | --into <branch>]
---

Apply working-tree changes to the current branch and automatically restack every upstack descendant. User input: `$ARGUMENTS`.

## Modes

- **Amend** (default) — folds staged changes into the existing commit. PR keeps the same identity; force-push needed on next submit.
  ```
  gt modify -a              # stage all + amend
  gt modify                 # amend already-staged changes
  ```
- **New commit** — adds a new commit on the same branch.
  ```
  gt modify -cam "fix tests"
  gt modify -c              # use already-staged changes
  ```
- **Into a downstack branch** — amend changes into an ancestor branch, then restack upward.
  ```
  gt modify --into <ancestor-branch>
  ```

## Steps

1. Run `git status --short` and `gt ls` so the user sees what is staged and where it will land.
2. Pick the mode from `$ARGUMENTS`. If ambiguous (multi-commit branch already exists), ask the user: amend or new commit? Amend keeps the branch single-commit (preferred Graphite style); new commit makes it a multi-commit branch that may need `gt squash` later.
3. Run the chosen `gt modify` command.
4. If the auto-restack hits conflicts:
   - Resolve in the editor.
   - `gt add .` to mark resolved.
   - `gt continue -a` to finish the restack chain.
   - `gt abort` to back out cleanly.
5. Run `gt ls` to confirm the new state.

## Key flags

- `-a, --all` — stage all modified files before amending
- `-c, --commit` — create a new commit instead of amending
- `-m, --message <msg>` — commit message (for `-c` or to reword on amend)
- `-p, --patch` — interactive hunk staging
- `--into <branch>` — amend into a downstack branch in one step

## When to use `gt absorb` instead

If the working-tree changes belong to **multiple** downstack branches (e.g. you fixed several bugs across the stack), use `gt absorb -a` — Graphite picks the right branch per hunk.
