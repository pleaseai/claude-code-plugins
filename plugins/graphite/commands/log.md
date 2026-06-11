---
description: Show the Graphite stack (gt log / gt ls)
allowed-tools: Bash
argument-hint: [--all | --stack | short]
---

Display the current Graphite stack structure. User input: `$ARGUMENTS`.

## Decide form

- `gt ls` (alias for `gt log short`) — compact tree, fastest, good default for orientation.
- `gt log` — full information per branch (PR status, last commit, worktree path).
- `gt log -a` / `gt log --all` — show every stack in the repo, not just the current one.
- `gt log -s` / `gt log --stack` — limit to the current stack.

If `$ARGUMENTS` is empty, run `gt ls`. Otherwise pass the args through.

## Reading the output

- `◉` (filled circle) marks the current branch.
- A worktree path next to a branch means it's checked out in another worktree — do not modify it from here.
- `needs restack` next to a branch means its parent has moved; run `/graphite:restack` before submitting.
- PR numbers and statuses (open, draft, merged) appear at the end of each line in `gt log`.

Just run the command and show the output to the user — do not interpret unless asked.
