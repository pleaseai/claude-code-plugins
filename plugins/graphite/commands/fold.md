---
description: Combine the current branch into its parent (gt fold)
allowed-tools: Bash, Read
argument-hint: [--keep | --close]
---

Merge the current branch's commits into its parent branch. Children of the current branch become children of the parent. User input: `$ARGUMENTS`.

## When to use

- Two adjacent branches turned out to be the same logical change and shouldn't be separate PRs.
- A small follow-up branch is ready to be rolled into the change it depends on.

## Steps

1. Run `gt ls` and confirm with the user **which** parent the current branch will fold into. Ask for confirmation before folding — this is destructive on the PR (the child branch's PR will be closed unless `--keep` is used).
2. Run `gt fold`. By default the resulting branch keeps the **parent's** name.
   - `gt fold --keep` (`-k`) — keep the child's name instead, retiring the parent's name.
   - `gt fold --close` (`-c`) — also close the now-redundant PR.
3. Auto-restack runs for upstack branches. Resolve conflicts as usual.
4. `gt submit -u` to update the surviving PR.

## Notes

- The folded branch now contains **both** sets of commits. Consider running `/graphite:squash` afterwards to keep the Graphite "one commit per branch" style.
- If you want the *opposite* — break a branch apart — use `/graphite:split`.
