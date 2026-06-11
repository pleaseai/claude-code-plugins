---
description: Distribute working-tree changes to the right downstack branches (gt absorb)
allowed-tools: Bash, Read
argument-hint: [-a (stage all) | -p (patch mode) | -d (dry run)]
---

When the working tree contains hunks that logically belong to **several different downstack branches**, `gt absorb` figures out which branch each hunk should amend into and applies them. User input: `$ARGUMENTS`.

## When to prefer absorb over modify

- The diff fixes things touched by multiple ancestors (e.g. typo in branch A and unrelated bug in branch B).
- You want to land review feedback that spans multiple PRs at once.
- For changes that all belong on the current branch, use `/graphite:modify` instead — it's simpler.

## Steps

1. Run `git status --short` so the user sees the working-tree state.
2. Run `gt ls` to show which branches are candidates downstack.
3. Run a dry run first: `gt absorb -a -d` (or `gt absorb -p -d` for hunk selection). Show the user the proposed branch-per-hunk assignment.
4. If the user approves, run without `-d` to apply. Each affected branch is amended, then everything upstack is auto-restacked.
5. Resolve any restack conflicts the usual way: `gt add .` → `gt continue -a`, or `gt abort`.
6. Run `gt ls` and consider `gt submit --stack -u` to update PRs.

## Key flags

- `-a, --all` — consider all modified files (default is staged only)
- `-p, --patch` — interactive hunk selection
- `-d, --dry-run` — show the plan without amending
