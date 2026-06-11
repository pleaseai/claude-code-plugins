---
description: Track existing git branches with Graphite (gt track / untrack)
allowed-tools: Bash, Read
argument-hint: [branch | --force | --untrack <branch>]
---

Bring branches that were created outside Graphite under `gt`'s control by recording their parent. User input: `$ARGUMENTS`.

## When you need this

- The branch was created with raw `git checkout -b` and Graphite doesn't know its parent.
- A teammate pushed branches you fetched via `git fetch` (not `gt get`).
- `gt` metadata was corrupted and needs to be re-established.

## Steps

1. Run `git branch --show-current` to confirm the branch under cursor.
2. If `$ARGUMENTS` starts with `--untrack` or is `-u`, run `gt untrack <branch>` and stop.
3. Otherwise:
   - For the **current** branch: `gt track` (will prompt for parent if ambiguous).
   - For a specific branch: `gt track <branch>`.
   - To auto-pick the nearest ancestor as parent without prompting: `gt track --force`.
4. To track an entire external stack, check out its **tip** and run `gt track` — it walks up until it hits an already-tracked branch.

## Important warnings

- **Don't** use raw `git rebase` on tracked branches afterwards — it can remove the base commit Graphite uses to identify the branch's start. If you must rebase, use `gt modify --interactive` or `gt restack`.
- If `gt track` complains about diverged parent, run `git rebase <parent>` **once** to align the branch on its parent, then `gt track` again.

## Key flags

- `-p, --parent <branch>` — set parent explicitly (skip the prompt)
- `-f, --force` — pick the nearest ancestor as parent automatically (useful for multi-branch tracking)
