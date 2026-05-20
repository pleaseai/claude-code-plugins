---
description: Switch branches in the stack (gt checkout / up / down / top / bottom)
allowed-tools: Bash, Read
argument-hint: [branch | up | down | top | bottom | trunk]
---

Move to a different branch in the Graphite stack. User input: `$ARGUMENTS`.

## Dispatch by argument

- `up` or empty + "next up" intent → `gt up` (alias `gt u`); accept a trailing number for steps (`gt up 2`).
- `down` → `gt down` (`gt d`); same step semantics.
- `top` → `gt top` (`gt t`).
- `bottom` → `gt bottom` (`gt b`).
- `trunk` or `main` → `gt checkout --trunk` (`gt co -t`).
- A branch name → `gt checkout <name>` (`gt co <name>`).
- Empty / no argument → `gt checkout` (interactive picker — only run if the session supports interactive prompts; otherwise show `gt ls` and ask the user to pick).

## Steps

1. If the working tree is dirty, run `git status --short` and confirm with the user — checkout will fail or carry the changes.
2. Run `gt ls` to show context.
3. Run the dispatched command.
4. Confirm with `gt ls` (the new current branch is marked `◉`).

## Notes

- When `gt up` or `gt top` hits a branch with multiple children, it prompts to disambiguate. In non-interactive contexts, pass the specific branch name instead.
- `gt checkout -s <branch>` switches to a branch and pulls its whole stack — useful when navigating to a teammate's stack after `gt get`.
