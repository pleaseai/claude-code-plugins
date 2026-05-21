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
- **Stacks cascade.** Labeling a PR mid-stack also labels its dependents (you cannot merge a parent without its children getting queued behind it). Removing the label cascades downstack in the same way.
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

**Mode resolution order** (use the first that exists):
1. `graphite.merge-queue.mode` in `.please/config.yml`.
2. The `GRAPHITE_MERGE_QUEUE_MODE` environment variable.
3. Fall back to `none` — assume no queue rather than silently labeling.

**Label resolution order** (use the first that exists; only meaningful when `mode: graphite`):
1. `graphite.merge-queue.label` in `.please/config.yml`.
2. The `MERGE_QUEUE_LABEL` environment variable.
3. Fall back to `merge-queue` (the most common default).

If `mode` is unset, ask: "Which merge queue does this repo use — Graphite's, GitHub-native, an external tool, or none?" — then offer to persist the answer.

### Reading the label without `yq`

The existing graphite hook parses `.please/config.yml` with awk to avoid a hard `yq` dependency. Use the same approach when you need the label from a shell:

```bash
# Print the configured merge-queue label, or "merge-queue" if missing.
awk '
  /^graphite:[[:space:]]*(#.*)?$/ { in_graphite=1; next }
  /^[^[:space:]#]/                { in_graphite=0; in_mq=0 }
  in_graphite && /^[[:space:]]+merge-queue:[[:space:]]*(#.*)?$/ { in_mq=1; next }
  in_mq && /^[[:space:]]+label:[[:space:]]*/ {
    sub(/^[[:space:]]+label:[[:space:]]*/, "")
    sub(/[[:space:]]+#.*$/, "")        # strip inline comment
    sub(/[[:space:]]+$/, "")            # strip trailing whitespace
    gsub(/^["'\'']|["'\'']$/, "")      # strip surrounding quotes
    print; exit
  }
' .please/config.yml 2>/dev/null || echo "merge-queue"
```

Prefer `yq` when available (`yq '.graphite.merge-queue.label // "merge-queue"' .please/config.yml`), but never make `yq` a hard requirement — many repos won't have it installed.

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
2. Identify the **topmost** branch the user wants merged. Label that PR's parent chain by labeling the **topmost PR** — Graphite cascades the label downstack to every dependent PR automatically, so you don't need to label each PR individually.
3. If the user wants only part of the stack queued (e.g. "queue up to branch X"), label X — everything below X queues automatically; everything above X is not queued.

Do not loop and label each PR with `gh pr edit` — that's redundant and risks racing the cascade.

## Dequeueing

```bash
gh pr edit --remove-label "$MERGE_LABEL"
```

Removing the label from a mid-stack PR cascades **downstack** (dependents drop out of the queue). Branches above the dequeued PR in the stack are unaffected.

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
| Label PR at top of stack | Queues the top; cascades down (every ancestor PR also queues, in dependency order) |
| Label PR mid-stack | Queues that PR and every PR below it; PRs above are untouched |
| Label PR at bottom (just above trunk) | Queues only that PR |
| Remove label from top | Dequeues top; PRs below remain queued |
| Remove label from mid-stack | Dequeues that PR and every PR below it |
| Approve a queued PR after labeling | "Merge when ready" fires automatically once mergeable |

The cascade direction is **from labeled PR toward trunk**, because Graphite must merge ancestors before descendants. This is the opposite of git's "downstack" terminology — be explicit when explaining to the user.

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
