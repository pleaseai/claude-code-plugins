---
name: graphite-merge-queue
description: Operate the Graphite Merge Queue — enqueue PRs via label, dequeue, monitor queue status, and reason about stacked-PR queueing. Use when the user mentions Graphite merge queue, "merge when ready", queueing a PR, dequeueing, fast-track, the merge-queue label, "enqueue", "the queue", or when they ask to merge a PR/stack through Graphite (not directly). Triggers on phrases like "queue this PR", "add to merge queue", "enqueue stack", "remove from queue", "why didn't my PR merge", and on edits to `.please/config.yml` under `graphite.merge-queue`.
tools: Bash, Read, Grep, Glob, Edit
user-invocable: false
---

# Graphite Merge Queue — Label-Based Enqueueing

This skill covers the **runtime** operation of Graphite's merge queue: adding/removing the merge label, reading queue config from `.please/config.yml`, and reasoning about stacked-PR enqueue cascade behavior.

For one-time setup (enabling the queue, configuring branch protection, choosing rebase vs squash), use the `graphite-setup` skill instead.

Source docs (cite when proposing actions):
- [Get started with Merge Queue](https://graphite.com/docs/get-started-merge-queue)
- [Set up the Merge Queue](https://graphite.com/docs/set-up-merge-queue)
- [Merge queue integration](https://graphite.com/docs/setup-merge-queue-integration)

## Mental model

- The merge queue **takes ownership of the merge** once a PR is enqueued. Graphite rebases the PR onto trunk, reruns required CI, and merges only after CI passes.
- **One label = one queue ticket.** Adding the configured merge label to a PR enqueues it. Removing the label dequeues it. There is no separate `/queue` command on Graphite's side — the label IS the queue API.
- **`merge when ready`**: if the label is applied before the PR is approved or CI passes, Graphite enables "merge when ready" and queues automatically when the PR becomes mergeable.
- **Stacks cascade.** Labeling a PR mid-stack also labels its descendants (upstack), and Graphite separately enqueues all ancestors (downstack) as queue dependencies — you cannot merge a parent without its children getting queued, and you cannot merge a child until its ancestors land. Removing the label cascades upstack in the same way (descendants drop out of the queue); downstack ancestors are unaffected.

> **Graphite stack terminology.** *Downstack* = toward trunk (ancestors). *Upstack* = away from trunk (descendants). Label propagation cascades **upstack**; queue dependencies pull in **downstack** ancestors.
- **Fast-track is single-PR only.** It does not apply to stacks. It still requires a rebase + CI rerun — it just jumps the queue position.
- **A Graphite account is required.** If the user labeling the PR has no Graphite account, the queue removes the label and prompts for account creation. Treat that as "labeled by the wrong user," not a queue bug.

## Repos that don't use Graphite's merge queue

Graphite supports four merge-queue postures. The label-based flow in this skill applies **only to mode `graphite`** — do not blindly apply a label in the other modes; you'll either no-op (no queue exists) or break the active queue (e.g. labeling a PR in a GitHub-native queue repo confuses operators and changes nothing).

| `merge-queue.mode` | Meaning | What to do when the user says "merge this PR" |
|---|---|---|
| `graphite` | Graphite's queue is enabled; label triggers enqueue | Apply the configured merge label (the rest of this skill) |
| `github-native` | GitHub's native merge queue is enabled | `gh pr merge --auto --squash` (or whatever strategy) — GitHub queues automatically. Do **not** apply the Graphite label; it does nothing. |
| `external` | Repo uses Mergify / Kodiak / etc. | Apply that tool's enqueue mechanism (usually its own label like `mergify-merge`). Defer to the external tool's docs; do not apply Graphite's label. |
| `none` (default) | No queue at all | Merge directly: `gt submit --merge` (Graphite UI "Merge stack") for stacks, or `gh pr merge --squash` for single PRs. |

Detect the active mode from `.please/config.yml` (see below). If it isn't set, **ask once** rather than assuming `graphite`. Choosing the wrong mode silently is worse than a one-line question.

## Reading merge-queue config from `.please/config.yml`

The label name and mode are repository-configurable. Read both from `.please/config.yml`:

```yaml
graphite:
  enabled: true
  merge-queue:
    mode: graphite               # graphite | github-native | external | none
    label: "merge-queue"          # used only when mode: graphite (must match Graphite settings)
    # remove-label: "merge-queue-remove"  # optional: separate dequeue label
```

**Bail-out check (run first):** if `graphite.enabled` is explicitly `false` in `.please/config.yml`, do not read or act on any `merge-queue` config — the repo has opted out of Graphite. The centralized parser sets `GRAPHITE_DISABLED=1` in that case (see [Centralized parser](#centralized-parser--scriptsread-merge-queue-configsh) below); when you see that, stop and tell the user the repo is opted out.

**Mode resolution order** (env var takes precedence — it's an explicit per-invocation override):
1. The `GRAPHITE_MERGE_QUEUE_MODE` environment variable.
2. `graphite.merge-queue.mode` in `.please/config.yml`.
3. Fall back to empty (and ask the user) — assume no queue rather than silently labeling.

**Label resolution order** (env var takes precedence; only meaningful when effective mode is `graphite`):
1. The `MERGE_QUEUE_LABEL` environment variable.
2. `graphite.merge-queue.label` in `.please/config.yml`.
3. Fall back to `merge-queue` (the most common default).

If `mode` is unset, ask: "Which merge queue does this repo use — Graphite's, GitHub-native, an external tool, or none?" — then offer to persist the answer.

### Centralized parser — `scripts/read-merge-queue-config.sh`

The plugin ships a single shell script that reads the disabled gate, mode, and label from `.please/config.yml` with one depth-tracked awk pass. Both this skill and the `/graphite:merge-queue` slash command call it; do not re-implement the parsing.

```bash
# Outputs three KEY=VALUE lines you can `eval`.
eval "$("${CLAUDE_PLUGIN_ROOT}/scripts/read-merge-queue-config.sh")"
# Variables now set:
#   GRAPHITE_DISABLED  — 1 iff graphite.enabled: false at the immediate
#                        child of graphite: (else 0).
#   MERGE_MODE         — graphite.merge-queue.mode, or empty.
#   MERGE_LABEL        — graphite.merge-queue.label, or empty.

# Apply env-var overrides:
MERGE_MODE="${GRAPHITE_MERGE_QUEUE_MODE:-$MERGE_MODE}"
MERGE_LABEL="${MERGE_QUEUE_LABEL:-${MERGE_LABEL:-merge-queue}}"
```

How the parser works (read `scripts/read-merge-queue-config.sh` for the awk):

- Tracks the indent of the first child of `graphite:` so only direct children (`enabled`, `merge-queue`) match — nested `enabled` keys (e.g. `graphite.merge-queue.enabled`) cannot trigger a false bail-out.
- Tracks the indent of the first child of `merge-queue:` the same way, so only direct children (`mode`, `label`) are read.
- Strips inline `# comment` trailers and surrounding quotes from the value.

Prefer `yq` if available (`yq '.graphite.merge-queue.label' .please/config.yml`), but never make `yq` a hard requirement — many repos won't have it installed. The shell script is the no-dependency fallback.

> **Known limitation:** the comment-stripping regex (`[[:space:]]+#`) does not respect quoted strings. A label like `"feature # tag"` would be truncated at the inner ` #`. Workaround for affected users: set `MERGE_QUEUE_LABEL` in the environment — env-var resolution happens before the YAML parse. If real-world users hit this, swap the parser for a quote-aware implementation in one place (`scripts/read-merge-queue-config.sh`).

## Enqueueing a PR (the golden path)

The label is the API. Use `gh` to apply it:

```bash
# 1. Confirm the PR is mergeable (or will be, with "merge when ready").
gh pr view --json number,state,mergeable,reviewDecision,statusCheckRollup

# 2. Apply the configured merge label.
gh pr edit --add-label "$MERGE_LABEL"

# 3. Verify Graphite picked it up — the label should still be present after a few seconds.
#    If Graphite strips it, the user labeling the PR likely lacks a Graphite account.
gh pr view --json labels --jq '.labels[].name'
```

Default to operating on the **current branch's PR** unless the user names one. Use `gh pr view` without arguments — `gh` resolves the PR from the checked-out branch.

### Enqueueing a whole stack

When the user says "queue the stack" in a Graphite repo:

1. Run `gt ls` to show the stack shape.
2. Identify the **topmost** branch the user wants merged. Label that PR — Graphite enqueues it plus all downstack ancestors (queue dependencies), so you don't need to label each ancestor individually. If the topmost PR has any upstack descendants, the label also cascades upstack and queues them.
3. To queue only "up to branch X" (X not at the top), label X — Graphite queues X plus all downstack ancestors AND all upstack descendants via the label cascade. There is no way to selectively queue downstack-only via labels; if the user wants to stop short of the top, the upstack descendants must be either out of scope (closed/merged) or you must hold off labeling until they are.

Do not loop and label each PR with `gh pr edit` — that's redundant and races the cascade.

## Dequeueing

```bash
gh pr edit --remove-label "$MERGE_LABEL"
```

Removing the label from a mid-stack PR cascades **upstack** (descendants drop out of the queue). Downstack ancestors are unaffected — they remain queued if they had been labeled separately.

Tell the user that dequeueing while CI is mid-rerun cancels the in-flight rebase but does not roll back any rebase that already landed on trunk.

## Inspecting queue state

There is no CLI command for the queue dashboard — direct the user to `https://app.graphite.com/<org>/<repo>/merge-queue`. From the terminal you can only check:

```bash
gh pr view <number> --json labels,mergeStateStatus,statusCheckRollup
```

A PR is "in the queue" iff:
- The configured merge label is present, AND
- The PR is open, AND
- A Graphite-side queue record exists (visible only in the Graphite UI).

If the label is present but the PR isn't merging, the cause is almost always one of: CI failing on the rebased SHA, the labeling user has no Graphite account (label gets stripped — check `gh pr view --json labels` again 30s later), or the queue is paused at the org level.

## Stacked-PR cascade — practical rules

| Action | Effect |
|---|---|
| Label PR at top of stack | Queues the top and all ancestors (downstack) |
| Label PR mid-stack | Queues that PR, all ancestors (downstack), and all descendants (upstack) |
| Label PR at bottom (just above trunk) | Queues that PR and all descendants (upstack) |
| Remove label from top | Dequeues top; descendants (if any) are also dequeued; ancestors remain |
| Remove label from mid-stack | Dequeues that PR and all descendants (upstack); ancestors remain |
| Approve a queued PR after labeling | "Merge when ready" fires automatically once mergeable |

The cascade direction for label propagation is **upstack** (away from trunk). However, Graphite ensures all **downstack** ancestors are also enqueued to satisfy dependencies.

## Common failure modes

- **"My PR is labeled but not merging."** Check: (a) `gh pr view --json reviewDecision,statusCheckRollup` — required reviews/checks passing? (b) Is the queue paused at the org level (Graphite UI)? (c) Did Graphite strip the label (no account)?
- **"The label keeps disappearing."** The user applying the label has no Graphite account, or it's not linked to the org. Direct them to `https://app.graphite.com`.
- **"A teammate's non-queue merge broke my queued PR."** Admins/maintainers can bypass branch protection. Their direct push to trunk restarts Graphite's in-flight merge. Recommend the user re-enable "restrict pushes to graphite-app only" — covered in the `graphite-setup` skill.
- **"My stack queued out of order."** Graphite queues in stack-dependency order, not labeling order. If the user labeled mid-stack PRs first, dependents still wait for ancestors. This is correct behavior, not a bug.
- **CI fails on the rebased SHA.** The PR is removed from the queue. Investigate the failure, fix, push, and re-label to re-enqueue.

## Operating principles for Claude

- **Always resolve `merge-queue.mode` first.** The merge-queue *flow* is mode-dependent; the rest of this skill is the `mode: graphite` branch. If mode isn't set in `.please/config.yml`, ask the user once and persist the answer.
- When mode is `github-native`, `external`, or `none`, **do not apply the Graphite label.** Use the merge path for that mode (see the table above) and recommend the user uninstall this skill's trigger if they'll never use the Graphite queue.
- Before applying the label (mode: graphite), run `gh pr view --json state,mergeable,reviewDecision` and surface the result — the user should see why their PR will or won't queue successfully.
- Never apply the label to a PR with a failing required check **unless** the user explicitly says "merge when ready" — silently queueing a known-broken PR wastes a CI run and queue slot.
- When labeling a stack, label only the topmost PR the user wants merged; do not iterate.
- When the user says "merge this PR" in a Graphite-queue repo, default to the queue path (label it) rather than `gh pr merge`. Confirm before bypassing the queue with `gh pr merge` — direct merges defeat the queue's ordering guarantees and can restart in-flight queue merges.
- If `.please/config.yml` lacks a `graphite.merge-queue.label`, ask once and offer to persist it.
- Cite the relevant Graphite doc page when proposing a configuration change so the user can verify.
