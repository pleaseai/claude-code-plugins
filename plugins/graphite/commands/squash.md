---
description: Squash all commits on the current branch into one (gt squash)
allowed-tools: Bash, Read
argument-hint: [-m "message" | --no-edit | --edit]
---

Collapse a multi-commit branch into a single commit. User input: `$ARGUMENTS`.

## When to use

- A branch accumulated several `gt modify -c` commits during review and should land as one logical change.
- After a `gt fold`, to keep the combined branch single-commit.

## Steps

1. Run `git log --oneline <parent>..HEAD` to show the commits about to be squashed.
2. Run `gt squash` — Graphite opens `$EDITOR` with all the commit messages concatenated so you can craft a final message.
   - `gt squash -m "<message>"` skips the editor with a preset message.
   - `gt squash -n` / `--no-edit` reuses the first commit's message untouched.
3. `gt squash` rewrites the branch's SHA. Upstack children now point at the old SHA — run `gt restack` to bring them onto the new commit. If `gt restack` hits conflicts, resolve in editor → `gt add .` → `gt continue -a`.
4. `gt submit -u` (or `gt submit --stack -u`) to force-push the updated branch to the PR.

## Notes

- Squashing rewrites the SHA → force-push is required. Graphite uses `--force-with-lease` so concurrent updates from teammates are rejected, not overwritten.
- The branch name is unchanged, so the PR stays the same.
