---
description: Enqueue or dequeue the current PR in Graphite's merge queue via label
allowed-tools: Bash, Read
argument-hint: [--remove | --stack | <pr-number>]
---

Add or remove the configured Graphite merge-queue label on a pull request. User input: `$ARGUMENTS`.

Graphite's merge queue is driven entirely by a label — applying it enqueues; removing it dequeues. For stacked PRs, the label cascades to dependent PRs automatically (label the topmost PR you want merged; do not iterate).

## Bail out for non-Graphite queue modes

Before doing anything, resolve `graphite.merge-queue.mode` from `.please/config.yml`. Only proceed with the label flow if mode is `graphite`. Otherwise stop and direct the user to the right path:

| Mode | What to do instead |
|---|---|
| `github-native` | `gh pr merge --auto --squash` (or chosen strategy) — GitHub queues automatically |
| `external` | Defer to the external tool (Mergify/Kodiak/etc.) — apply its enqueue label, not Graphite's |
| `none` | `gt submit --merge` for stacks, or `gh pr merge` for a single PR |
| unset | Ask the user which mode the repo uses, then offer to persist it to `.please/config.yml` |

```bash
MERGE_MODE="$(
  awk '
    /^graphite:[[:space:]]*(#.*)?$/ { in_graphite=1; next }
    /^[^[:space:]#]/                { in_graphite=0; in_mq=0 }
    in_graphite && /^[[:space:]]+merge-queue:[[:space:]]*(#.*)?$/ { in_mq=1; next }
    in_mq && /^[[:space:]]+mode:[[:space:]]*/ {
      sub(/^[[:space:]]+mode:[[:space:]]*/, "")
      sub(/[[:space:]]+#.*$/, "")
      sub(/[[:space:]]+$/, "")
      gsub(/^["'\'']|["'\'']$/, "")
      print; exit
    }
  ' .please/config.yml 2>/dev/null
)"
MERGE_MODE="${MERGE_MODE:-${GRAPHITE_MERGE_QUEUE_MODE:-}}"

case "$MERGE_MODE" in
  graphite) ;;  # continue below
  "")       echo "merge-queue.mode not configured. Ask the user, then persist to .please/config.yml."; exit 0 ;;
  *)        echo "Repo uses '$MERGE_MODE' merge queue, not Graphite's. Skipping label flow."; exit 0 ;;
esac
```

## Resolve the merge label

Only relevant when `mode: graphite`. Read the label name from configuration, in this order:

1. `graphite.merge-queue.label` in `.please/config.yml` at the repo root.
2. `$MERGE_QUEUE_LABEL` environment variable.
3. Fall back to `merge-queue`.

Shell snippet (works without `yq`):

```bash
MERGE_LABEL="$(
  awk '
    /^graphite:[[:space:]]*(#.*)?$/ { in_graphite=1; next }
    /^[^[:space:]#]/                { in_graphite=0; in_mq=0 }
    in_graphite && /^[[:space:]]+merge-queue:[[:space:]]*(#.*)?$/ { in_mq=1; next }
    in_mq && /^[[:space:]]+label:[[:space:]]*/ {
      sub(/^[[:space:]]+label:[[:space:]]*/, "")
      sub(/[[:space:]]+#.*$/, "")
      sub(/[[:space:]]+$/, "")
      gsub(/^["'\'']|["'\'']$/, "")
      print; exit
    }
  ' .please/config.yml 2>/dev/null
)"
MERGE_LABEL="${MERGE_LABEL:-${MERGE_QUEUE_LABEL:-merge-queue}}"
```

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
4. For a Graphite stack, run `gt ls` and identify the topmost PR the user wants merged. Apply the label to **that** PR only — Graphite cascades downstack automatically. Do not loop.
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
