# graphite

Stacked pull-request workflow with the Graphite CLI (`gt`). Teaches Claude to drive `gt` for creating, syncing, restacking, and submitting branch stacks.

## Overview

[Graphite](https://graphite.com) is a developer-tool layer on top of `git` and GitHub that makes **stacks of small PRs** ergonomic. A stack is a sequence of branches where each builds on its parent and lands as its own PR. This plugin makes Claude aware of the stack model so it uses `gt` instead of raw `git` for branch creation, rebasing, and pushes.

The plugin includes:

- A **skill** (`graphite`) that activates whenever stacked-PR or `gt` work comes up. It documents the mental model, the golden path, conflict-resolution patterns, worktree handling, and multi-trunk setups.
- A **setup skill** (`graphite-setup`) that activates when configuring a repo for Graphite — GitHub branch protection, merge queue choice (Graphite / GitHub native / external), CI triggers, ignoring `graphite-base/*` branches, and stack-aware CI Optimizations.
- A **merge-queue skill** (`graphite-merge-queue`) that handles runtime operation of Graphite's queue — label-based enqueueing, stack cascade rules, dequeueing, and reading the configured label from `.please/config.yml`.
- **16 slash commands** covering basic workflows (`create`, `submit`, `sync`, `log`, `checkout`, `modify`), advanced operations (`restack`, `absorb`, `split`, `squash`, `fold`, `track`, `reorder`, `move`, `get`), and merge-queue operation (`merge-queue`).

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
| `/graphite:merge-queue` | Enqueue (or dequeue with `--remove`) the current PR via Graphite's merge label |

### Merge queue configuration

Graphite supports four merge-queue postures. Declare which one your repo uses so the plugin picks the right merge path:

```yaml
graphite:
  enabled: true
  merge-queue:
    mode: graphite          # graphite | github-native | external | none
    label: "merge-queue"     # used only when mode: graphite (must match Graphite settings)
```

| `mode` | What `/graphite:merge-queue` does |
|---|---|
| `graphite` | Applies/removes the configured label — Graphite enqueues |
| `github-native` | Refuses; directs you to `gh pr merge --auto` |
| `external` | Refuses; directs you to the external tool's enqueue mechanism |
| `none` / unset | Refuses; directs you to `gt submit --merge` or `gh pr merge` |

Fallback chain for the label (when `mode: graphite`): `graphite.merge-queue.label` → `$MERGE_QUEUE_LABEL` → `merge-queue`.

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

### Setup & configuration (covered by the `graphite-setup` skill)

- [GitHub configuration guidelines](https://graphite.com/docs/github-configuration-guidelines)
- [Setup: merge queue integration](https://graphite.com/docs/setup-merge-queue-integration)
- [Setup: recommended CI settings](https://graphite.com/docs/setup-recommended-ci-settings)
- [Stacking and CI](https://graphite.com/docs/stacking-and-ci)

### Merge queue (covered by the `graphite-merge-queue` skill)

- [Get started with Merge Queue](https://graphite.com/docs/get-started-merge-queue)
- [Set up the Merge Queue](https://graphite.com/docs/set-up-merge-queue)
