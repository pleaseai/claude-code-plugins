---
name: graphite
description: Drive the Graphite CLI (`gt`) for stacked pull-request workflows. Use when the user works with stacked PRs, mentions Graphite, gt, "the stack", or wants to create/submit/sync/restack/split/squash/fold branches. Triggers on `gt` commands, "stack of PRs", "stacked diffs", "trunk-based", `.graphite_repo_config`, branches prefixed by a Graphite user (e.g. `lms--`, `pp--`).
tools: Bash, Read, Grep, Glob, Edit
user-invocable: false
---

# Graphite CLI (`gt`) — Stacked PR Workflow

Invoke the CLI as `gt` (not `graphite`). A stack is a chain of branches where each builds on its parent and maps to one PR.

When the user is in a Graphite repo (`.git/.graphite_repo_config` present) or mentions stacked PRs / `gt` / Graphite, prefer `gt` over raw `git` for branch creation, rebasing, and pushes. Plain git still works for staging, diffing, logs, and inspection.

## Core mental model

- **One commit per branch.** Stack additional changes by creating new branches on top, not new commits on the same branch.
- **Trunk is `main`** (or whatever `gt init` selected). Stacks are rooted on trunk.
- **`gt` knows the parent of every tracked branch.** It uses that metadata to restack automatically when ancestors change.
- **Do not use raw `git rebase` to move tracked branches.** It can wipe Graphite metadata. Use `gt modify`, `gt restack`, or `gt move` instead.

## The golden path: create → submit

```bash
# Make changes, then:
gt create -am "feat: add activity feed API"   # stage all, commit, new branch
# More changes for the next layer:
gt create -am "feat: render feed in UI"       # creates branch on top of previous
gt submit --stack                              # push all branches, open PRs
```

- `gt create [name]` creates a branch from the current HEAD with the staged changes already committed. With `-a` it stages all changes; with `-m "..."` it sets the commit message; combined `-am "..."` is the common form.
- `gt c` is the alias for `gt create`.
- `gt submit` pushes the current branch and downstack; `gt submit --stack` (alias `gt ss`) pushes every branch in the current stack and opens/updates PRs for each.

## Viewing the stack

```bash
gt log         # full tree with branches, PRs, worktree paths
gt ls          # compact view (alias for `gt log short`)
```

The filled circle (◉) marks the current branch. Always run `gt ls` before any restack/move operation to confirm parent relationships.

## Navigating the stack

| Goal | Command | Alias |
|------|---------|-------|
| Move up one branch | `gt up` | `gt u` |
| Move down one branch | `gt down` | `gt d` |
| Top of stack | `gt top` | `gt t` |
| Bottom of stack | `gt bottom` | `gt b` |
| Specific branch (interactive) | `gt checkout` | `gt co` |
| Jump to trunk | `gt checkout --trunk` | `gt co -t` |
| Show parent | `gt parent` | — |
| Show children | `gt children` | — |

`gt up` and `gt top` prompt for disambiguation when a branch has multiple children.

## Editing a mid-stack branch

```bash
gt co some_mid_branch       # check out the branch
# edit files
gt modify -a                # amend the existing commit; upstack restacks automatically
# OR add a new commit on this branch:
gt modify -cam "fix tests"
```

- `gt modify` (alias `gt m`) amends the current branch's commit and **automatically restacks every upstack descendant**. No need to run `gt restack` manually after a clean modify.
- Use `-c` / `--commit` to add a new commit instead of amending.
- Use `--into <branch>` to amend staged changes into a downstack branch in one step.
- For changes that should land in multiple downstack branches simultaneously, use `gt absorb -a` (Graphite picks the right branch per hunk).

### When restack hits a conflict

```
# resolve conflicts in editor
gt add .                     # mark resolved (gt add wraps git add)
gt continue -a               # finish the restack
# or
gt abort                     # bail out safely
```

## Syncing with the remote

```bash
gt sync
```

This single command:
1. Pulls trunk from `origin`,
2. Detects merged branches and prompts to delete them,
3. Restacks the remaining branches onto the new trunk tip.

If a restack conflicts, `gt sync` exits with a list of branches to fix. Check each out and run `gt restack`, then resolve as above.

Prefer `gt sync` over `git pull` whenever the working repo has tracked Graphite branches — `git pull` won't restack the stack.

## Submitting / updating PRs

```bash
gt submit               # current branch + downstack
gt submit --stack       # entire current stack (alias: gt ss)
gt submit --stack -u    # update PRs only, don't create new ones (gt ss -u)
```

`gt submit` interactively asks whether to open a draft PR and whether to edit the description. To skip prompts, pass `-c` / `--confirm`. To open the editor unconditionally, pass `-e` / `--edit`.

## Manual restack

You only need this when:
- `gt sync` reported conflicts on a branch, or
- A parent advanced (squash-merge on GitHub) and children still point at the old SHA, or
- After a `git rebase` you ran by hand on a tracked branch (avoid this).

```bash
gt restack              # restack current stack on top of current parents
gt restack -u           # only upstack from current branch
gt restack -d           # only downstack
gt restack -o           # only this branch (no children/parents)
```

## Reorganizing the stack

| Operation | Command | Notes |
|-----------|---------|-------|
| Move current branch to a new parent | `gt move --onto <branch>` | Restacks dependents automatically |
| Interactive reorder | `gt reorder` | Opens editor with branch list; rearrange lines |
| Insert a new branch mid-stack | `gt create --all --insert -m "..."` | Other branches restack onto it |
| Fold branch into its parent | `gt fold` | `--keep` keeps the child's name |
| Squash a multi-commit branch into one | `gt squash` | Opens editor for the new message; `-m "..."` to skip |
| Split a branch | `gt split --by-commit` / `--by-file "*.json"` / `--by-hunk` | Three modes |
| Delete a branch but keep the changes | `gt pop` | |
| Delete a branch entirely | `gt delete [-f]` | `-c` also closes the PR |

When splitting a branch that already has a PR, **keep the original branch name** for one of the pieces — GitHub PR branch names are immutable, so any renamed piece becomes a new PR.

## Tracking existing git branches

If a branch was created with raw `git checkout -b`, Graphite doesn't know its parent yet:

```bash
gt track                    # prompts to pick a parent (or the only candidate)
gt track <branch>           # track a specific branch
gt track --force            # auto-pick nearest ancestor as parent
gt untrack <branch>         # stop tracking
```

Run `gt track` from the **tip** of an external stack to track multiple branches at once (walks up until it hits an already-tracked branch).

## Collaborating on someone else's stack

```bash
gt get <branch>             # fetch their stack locally
# branches arrive frozen by default — no accidental edits
gt unfreeze <branch>        # to extend their work
gt create -am "my addition" # stack your branch on top
gt submit                   # push and open your own PR(s)
```

`gt freeze` / `gt unfreeze` toggle the lock manually. `gt info` shows freeze status.

## Worktrees

`gt log` displays a worktree path next to any branch checked out elsewhere. Rules of thumb:

- `gt sync`, `gt get`, `gt restack` must be run **from each worktree** that owns branches in the stack.
- To start a branch on top of a branch that's checked out in another worktree, use `gt create --onto <branch>` from the current worktree.
- `gt undo` is per-worktree.

## Multiple trunks

Repos that maintain release branches alongside `main` can register both as trunks:

```bash
gt trunk --add release-v10
gt trunk --all
gt sync --all              # sync every trunk and its stacks
gt log short --all         # show stacks across all trunks
```

Branches are auto-associated with whichever trunk they were created off of.

## Recovery

- `gt undo` reverses the most recent Graphite mutation (per worktree).
- Conflicts during any restack-style operation: `gt add .` → `gt continue -a`, or `gt abort` to back out.

## Operating principles for Claude

- Before any restack, move, fold, squash, or split, run `gt ls` and show the output so the user sees the current shape.
- Never run `git rebase`, `git reset --hard`, or `git push --force` on a tracked branch without explicit confirmation — use the `gt` equivalent (`gt modify`, `gt restack`, `gt move`, `gt submit --force`).
- After resolving a restack conflict, prefer `gt continue` over running `git rebase --continue` directly.
- When the user asks for a "new branch on top of X," default to `gt create -am "..."` from X — don't construct branch names manually unless asked; `gt` derives them from the commit message.
- For multi-commit work, ask whether to keep multiple commits (`gt modify -c`) or amend (`gt modify`) — the answer determines whether the next `gt submit` updates the same PR or needs `gt squash` first.
- If `.git/.graphite_repo_config` is missing, treat the repo as un-initialized and propose `gt init` before any other `gt` command.
