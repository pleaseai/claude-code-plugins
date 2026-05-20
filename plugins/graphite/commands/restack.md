---
description: Rebase branches onto current parents and resolve restack conflicts (gt restack)
allowed-tools: Bash, Read, Edit
argument-hint: [--upstack | --downstack | --only]
---

Repair the stack when branches point at stale parent commits. User input: `$ARGUMENTS`.

## When restack is needed

- `gt sync` reported "could not restack" for one or more branches.
- A PR was squash-merged on GitHub — children still reference the pre-squash SHA.
- A manual `git rebase` was run on a tracked branch (avoid this in general).
- `gt ls` shows `needs restack` next to a branch.

## Steps

1. Run `gt ls` to identify branches marked `needs restack`.
2. If a specific branch was named in conflict output, `gt co <branch>` first.
3. Run the appropriate scope:
   - `gt restack` — restack the current stack on its current parents.
   - `gt restack -u` / `--upstack` — only branches above the current one.
   - `gt restack -d` / `--downstack` — only branches below the current one.
   - `gt restack -o` / `--only` — current branch only, leave neighbors.
4. On conflict during the rebase:
   - Resolve conflicts in editor (markers `<<<<<<<` / `=======` / `>>>>>>>`).
   - `gt add .` to mark resolved (wraps `git add`).
   - `gt continue -a` to finish the restack chain.
   - Or `gt abort` to back out — safe to do.
5. After clean restack, run `gt ls` to confirm and consider `gt submit --stack -u` to update the PRs.

## Notes

- `gt restack` is idempotent — running it on an already-clean stack is a no-op.
- Across worktrees: run `gt restack` from **each** worktree that owns branches in the stack (Graphite 1.8.4+).
