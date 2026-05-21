---
description: Enqueue or dequeue the current PR in Graphite's merge queue via label
allowed-tools: Bash, Read
argument-hint: [--remove | --stack | <pr-number>]
---

Add or remove the configured Graphite merge-queue label on a pull request. User input: `$ARGUMENTS`.

Graphite's merge queue is driven entirely by a label — applying it enqueues; removing it dequeues. For stacked PRs, the label cascades to dependent PRs automatically (label the topmost PR you want merged; do not iterate).

## Resolve config (enabled gate, mode, label)

All parsing is centralized in `${CLAUDE_PLUGIN_ROOT}/scripts/read-merge-queue-config.sh`, which emits three `KEY=VALUE` lines. `eval` the output, then apply env-var overrides:

```bash
eval "$("${CLAUDE_PLUGIN_ROOT}/scripts/read-merge-queue-config.sh")"

# Env-var overrides (caller can force a value without editing .please/config.yml)
MERGE_MODE="${GRAPHITE_MERGE_QUEUE_MODE:-$MERGE_MODE}"
MERGE_LABEL="${MERGE_QUEUE_LABEL:-${MERGE_LABEL:-merge-queue}}"

# 1. Bail if graphite is disabled.
if [ "$GRAPHITE_DISABLED" = "1" ]; then
  echo "graphite.enabled: false in .please/config.yml — repo opted out of Graphite. Skipping."
  exit 0
fi

# 2. Dispatch on mode. Only `graphite` continues with the label flow.
case "$MERGE_MODE" in
  graphite) ;;  # continue below
  "")       echo "merge-queue.mode not configured in .please/config.yml. Ask the user which mode the repo uses, then persist it."; exit 0 ;;
  *)        echo "Repo uses '$MERGE_MODE' merge queue, not Graphite's. Skipping label flow."; exit 0 ;;
esac
```

### Modes that this command does NOT handle

| Mode | What to do instead |
|---|---|
| `github-native` | `gh pr merge --auto --squash` (or chosen strategy) — GitHub queues automatically |
| `external` | Defer to the external tool (Mergify/Kodiak/etc.) — apply its enqueue label, not Graphite's |
| `none` | `gt submit --merge` for stacks, or `gh pr merge` for a single PR |
| unset | Ask the user which mode the repo uses, then offer to persist it to `.please/config.yml` |

### Resolution precedence

- **Mode:** `GRAPHITE_MERGE_QUEUE_MODE` env var → `graphite.merge-queue.mode` in `.please/config.yml` → empty (caller asks).
- **Label:** `MERGE_QUEUE_LABEL` env var → `graphite.merge-queue.label` in `.please/config.yml` → `merge-queue` (default).
- **Disabled gate:** only `graphite.enabled: false` at the immediate child of `graphite:` triggers bail-out; the script's depth-tracking ignores nested `enabled` keys.

If `.please/config.yml` has no label and the user hasn't named one, tell them: the default `merge-queue` will be used; persist it to `.please/config.yml` by adding:

```yaml
graphite:
  merge-queue:
    label: "merge-queue"
```

## Steps

1. Resolve `MERGE_LABEL` as above. Print it back to the user so they can confirm the right queue is targeted.
2. Resolve the target PR: a `<pr-number>` argument wins; otherwise default to the current branch's PR (`gh pr view --json number`).
3. Run `gh pr view <pr> --json state,mergeable,reviewDecision,statusCheckRollup,labels` and show the result. If the PR is closed/merged, stop. If required checks are failing, surface that and ask whether to apply the label anyway (Graphite will hold it as "merge when ready").
4. For a Graphite stack, run `gt ls` and identify the topmost PR the user wants merged. Apply the label to **that** PR only — Graphite enqueues it plus all downstack ancestors as queue dependencies, and cascades the label upstack to any descendants. Do not loop.
5. Apply or remove the label:
   - Default / `--stack`: `gh pr edit <pr> --add-label "$MERGE_LABEL"`
   - `--remove`: `gh pr edit <pr> --remove-label "$MERGE_LABEL"`
6. Wait ~10s, then re-check `gh pr view <pr> --json labels`. If the label was stripped, the labeling user likely has no Graphite account — direct them to `https://app.graphite.com`.
7. Print the merge-queue dashboard URL for the repo: `https://app.graphite.com/<org>/<repo>/merge-queue`.

## Key flags

- `--remove` — dequeue instead of enqueue (removes the label; cascades to dependents)
- `--stack` — explicitly label the topmost PR of the current Graphite stack (default is the current branch's PR)
- `<pr-number>` — target a specific PR instead of the current branch's PR

## Notes

- The label IS the API. Do not also run `gh pr merge` — that bypasses the queue and can restart in-flight queue merges.
- Fast-track (front-of-queue jump) is single-PR only and is available only in the Graphite app UI, not via label.
- For background on cascade rules, failure modes, and config schema, see the `graphite-merge-queue` skill.
