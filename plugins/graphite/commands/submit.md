---
description: Push the current stack and create/update PRs (gt submit)
allowed-tools: Bash, Read
argument-hint: [--stack | --update-only | reviewers]
---

Submit the current Graphite stack to the remote and open or update pull requests. User input: `$ARGUMENTS`.

## Decide scope

- Default `gt submit` pushes the current branch and everything **downstack** from it.
- `gt submit --stack` (alias `gt ss`) pushes the entire stack rooted at trunk.
- `gt submit --stack --update-only` (`gt ss -u`) updates PRs only — won't open new ones.

If the user didn't specify scope and the stack has more than one branch, ask whether they want `--stack` or just the current branch + downstack.

## Steps

1. Run `gt ls` and show the user which branches will be submitted.
2. Run `git status --short` to confirm there are no uncommitted changes. If there are, ask whether to `gt modify -a` them in first, stash, or abort.
3. Run `gt sync --no-pull` or `gt restack` if `gt ls` shows any branch as `needs restack` — do not submit a stale stack.
4. Run the appropriate `gt submit` command. Pass `-c` / `--confirm` to skip interactive prompts only if the user asked for non-interactive.
5. Report each created/updated PR URL from the output.

## Key flags

- `--stack` — submit every branch in the stack (not just current + downstack)
- `--update-only`, `-u` — update existing PRs, never create new ones
- `--draft` — open as draft
- `-c, --confirm` — skip the interactive prompts
- `-e, --edit` — open `$EDITOR` for each PR description
- `-f, --force` — force-push (use with care; Graphite already uses `--force-with-lease` by default)
- `--ai` — Graphite drafts the PR title/body
