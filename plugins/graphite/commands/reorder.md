---
description: Interactively reorder branches in the current stack (gt reorder)
allowed-tools: Bash, Read
argument-hint: [--stack]
---

Reshuffle the order of branches in the current stack via an editor-based picker. User input: `$ARGUMENTS`.

## How it works

`gt reorder` opens `$EDITOR` with the current branch and its ancestors (downstack), one branch per line. Rearrange the lines to set the new order. You can also delete lines (removes the branch from the stack) or add lines (must reference branches Graphite already knows about).

## Steps

1. Run `gt ls` to show the user the stack today.
2. Ask which form they want:
   - `gt reorder` — just the downstack of the current branch.
   - `gt reorder --stack` — the entire stack (trunk → tip).
3. Run the command. Graphite will open the editor; if the session is non-interactive, suggest using `/graphite:move --onto <branch>` to reposition one branch at a time instead.
4. On save, Graphite performs the restacks. Resolve any conflicts as usual: `gt add .` → `gt continue -a`, or `gt abort`.
5. Run `gt ls` to confirm.

## When to prefer alternatives

- Moving a **single branch** to a new parent → `/graphite:move` with `--onto <branch>`.
- Inserting a **new branch** mid-stack → `gt create --insert -am "..."` (covered by `/graphite:create`).
