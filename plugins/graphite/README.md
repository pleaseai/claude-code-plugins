# graphite

Stacked pull-request workflow with the Graphite CLI (`gt`). Teaches Claude to drive `gt` for creating, syncing, restacking, and submitting branch stacks.

## Overview

[Graphite](https://graphite.com) is a developer-tool layer on top of `git` and GitHub that makes **stacks of small PRs** ergonomic. A stack is a sequence of branches where each builds on its parent and lands as its own PR. This plugin makes Claude aware of the stack model so it uses `gt` instead of raw `git` for branch creation, rebasing, and pushes.

The plugin includes:

- A **skill** (`graphite`) that activates whenever stacked-PR or `gt` work comes up. It documents the mental model, the golden path, conflict-resolution patterns, worktree handling, and multi-trunk setups.
- **15 slash commands** covering basic workflows (`create`, `submit`, `sync`, `log`, `checkout`, `modify`) and advanced operations (`restack`, `absorb`, `split`, `squash`, `fold`, `track`, `reorder`, `move`, `get`).

## Prerequisites

Install and authenticate the Graphite CLI first — this plugin drives the CLI, it does not install it.

```sh
# macOS
brew install withgraphite/tap/graphite

# Other platforms / npm
npm install -g @withgraphite/graphite-cli

# Authenticate (one time)
gt auth
```

Then in your repo:

```sh
gt init   # select trunk branch (usually main)
```

## Installation

```sh
claude
/plugin marketplace add pleaseai/claude-code-plugins
/plugin install graphite@pleaseai
```

## Commands

### Basic

| Command | Purpose |
|---------|---------|
| `/graphite:create` | Create a new stacked branch from the current working-tree changes |
| `/graphite:submit` | Push the stack and create/update PRs |
| `/graphite:sync` | Pull trunk, prune merged branches, restack |
| `/graphite:log` | Show the stack (`gt ls` / `gt log`) |
| `/graphite:checkout` | Move between branches (up/down/top/bottom/name) |
| `/graphite:modify` | Amend or add a commit on the current branch (auto-restacks upstack) |

### Advanced

| Command | Purpose |
|---------|---------|
| `/graphite:restack` | Repair branches after parent SHA changes; drive conflict resolution |
| `/graphite:absorb` | Distribute working-tree changes across the right downstack branches |
| `/graphite:split` | Break the current branch into multiple branches by commit/file/hunk |
| `/graphite:squash` | Squash a multi-commit branch into one |
| `/graphite:fold` | Combine the current branch into its parent |
| `/graphite:track` | Bring an externally-created git branch under Graphite |
| `/graphite:reorder` | Interactively reorder branches in the stack |
| `/graphite:move` | Rebase the current branch (and dependents) onto a new parent |
| `/graphite:get` | Fetch a teammate's stack to collaborate |

## How it works

The skill loads automatically when the user mentions Graphite, `gt`, stacked PRs, or works in a repo containing `.git/.graphite_repo_config`. It teaches Claude to:

- Prefer `gt` over raw `git` for branch operations on tracked branches
- Run `gt ls` before any destructive operation to confirm stack shape
- Resolve restack conflicts via `gt add .` → `gt continue -a` (not `git rebase --continue`)
- Handle worktrees: run stack commands from each owning worktree
- Avoid `git rebase` on tracked branches (corrupts Graphite metadata)

A `SessionStart` hook also detects `.graphite_repo_config` inside the git common dir (worktree-safe via `git rev-parse --git-common-dir`) and injects a short notice so Claude reaches for `gt` from the first turn — even before any keyword in the conversation triggers the skill. If the `gt` CLI is missing, the hook surfaces the install command instead.

## Links

- [Graphite docs](https://graphite.com/docs)
- [CLI quick start](https://graphite.com/docs/cli-quick-start)
- [Command cheatsheet](https://graphite.com/docs/cheatsheet)
- [Command reference](https://graphite.com/docs/command-reference)
