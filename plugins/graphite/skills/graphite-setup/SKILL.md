---
name: graphite-setup
description: Configure a GitHub repository for Graphite — branch protection, merge queue, CI triggers, and stack-aware CI optimizations. Use when the user is onboarding a repo to Graphite, mentions Graphite branch protection / required checks / signed commits / merge queue, sees CI failing on `graphite-base/*` branches, asks about merge-queue choice (Graphite vs GitHub vs external), or wants to reduce CI cost for stacked PRs (CI Optimizations, stack-aware CI, `needs.optimize_ci.outputs.skip`). Triggers on `.github/workflows/*.yml` changes for repos using Graphite, the phrases "stack CI", "stacking and CI", "graphite-base", and any branch-protection or merge-queue discussion in a Graphite repo.
tools: Bash, Read, Grep, Glob, Edit
user-invocable: false
---

# Graphite — Repository Setup & CI Configuration

This skill is the counterpart to the `graphite` skill (CLI workflow). It covers the one-time and ongoing **repository / GitHub / CI** configuration that lets `gt` stacks merge cleanly. If the user is driving `gt` locally, use the `graphite` skill instead.

Source docs (cite when proposing changes):
- [GitHub configuration guidelines](https://graphite.com/docs/github-configuration-guidelines)
- [Setup: merge queue integration](https://graphite.com/docs/setup-merge-queue-integration)
- [Setup: recommended CI settings](https://graphite.com/docs/setup-recommended-ci-settings)
- [Stacking and CI](https://graphite.com/docs/stacking-and-ci)

## When to reach for this skill

- The user just installed Graphite on a new repo and asks "what do I need to configure?"
- A stack failed to push or merge with branch-protection / required-check errors.
- A CI job is failing on a branch named `graphite-base/<something>` (often "branch not found" right after a merge).
- The user is choosing between GitHub's native merge queue, Graphite's merge queue, or an external one.
- The user wants to cut CI cost on tall stacks (CI Optimizations / stack-aware skipping).
- The user wants signed commits, IP allowlisting, or enterprise GitHub App access for Graphite.

## GitHub repository settings

### Critical (Graphite won't work correctly without these)

- **Allow many branches per push** — disable GitHub's "limit how many branches can be updated in a single push" restriction. `gt submit --stack` pushes every branch in the stack atomically; the cap breaks that.
- **Automatically delete head branches** — enable. When a parent PR merges, downstack PRs need their base re-pointed; auto-delete avoids stale base branches blocking the rebase.

### Branch protection — must be off

These look helpful but break Graphite's automatic rebases:

| Setting | Required state | Why |
|---|---|---|
| Dismiss stale approvals on new push | **Disabled** | Graphite rebases during merge — every rebase counts as a new push and would dismiss approvals. (Graphite ships an open-source GitHub Action as an alternative if your org needs dismissal behavior.) |
| Require approval of the most recent push | **Disabled** | Graphite re-targets the base branch before merge; that re-targeting is a reviewable push and blocks the merge. |
| GitHub native merge queue | **Disabled** | Use Graphite's merge queue (or none) — GitHub's queue doesn't understand stacks and can merge out of order. |
| Deployment checks as required status | **Disabled** | Not supported by Graphite today. |
| Signed commits | **Off, unless** every engineer has uploaded a signing key in Graphite | Otherwise Graphite's server-side rebase will produce unsigned commits and fail the check. |

### Branch protection — recommended

Safe defaults that don't conflict with Graphite:

- Require PRs before merging to trunk.
- Require **at least one approval**.
- Require **conversation resolution** before merging.
- Required status checks for the critical CI jobs (see CI section — be careful which jobs you mark "required" once you turn on CI Optimizations).
- **Linear history** — keep on; matches the stack model and makes bisect/blame readable.
- **Allow administrators to bypass** — keep on, for incident response.

## Merge queue: pick one

Graphite supports three modes. The right answer depends on org constraints, not preference.

| Mode | When to pick it | What to configure |
|---|---|---|
| No merge queue | Small team, low merge contention, no required checks that depend on a queued state | Nothing extra — `gt submit --merge` / "Merge stack" in Graphite UI just merges directly. |
| Graphite merge queue | You want stack-aware batching, parallel CI, and ordered merges | Enable in Graphite settings; disable GitHub's native queue in branch protection. |
| External / non-Graphite merge queue | Org standardizes on a third-party queue (e.g. mergify, kodiak, custom) | Per-repo "External Merge Queue Integration (Beta)" wiring so Graphite knows who to hand the PR off to. |

Do not enable both Graphite's queue and GitHub's native queue — they will fight over who owns the merge.

Source: [setup-merge-queue-integration](https://graphite.com/docs/setup-merge-queue-integration).

## CI configuration

### Ignore `graphite-base/*` branches

Graphite materializes temporary branches under `graphite-base/<something>` during rebase/merge. They get deleted seconds later. CI that targets them will fail with "branch not found" mid-run.

GitHub Actions:

```yaml
on:
  pull_request:
    types: [opened, reopened, synchronize]
    branches-ignore:
      - "**/graphite-base/**"
```

Avoid `pull_request: types: [edited]` — it fires every time a base branch is re-pointed, which Graphite does often.

### Run CI on the whole stack, not just trunk

Graphite gates merge on the required checks for the PR's **target branch** (usually `main`). If those checks only run on `pull_request` against `main`, the upstack PRs won't have results until their parent merges — meaning a tall stack merges one PR at a time, with full CI waits between each.

Configure workflows to run on any branch except `graphite-base/*`. The exception above (`branches-ignore`) already handles this for `pull_request`; mirror it for `push` triggers if you have them.

Source: [setup-recommended-ci-settings](https://graphite.com/docs/setup-recommended-ci-settings).

## CI Optimizations (stack-aware skipping)

For repos with tall stacks, Graphite can skip CI on intermediate PRs and only run it on a few branches per stack. Per-repo config:

- **Number of PRs at the base of the stack** that should run CI (e.g. 1 or 2).
- Whether to **also run on the top of the stack**.

Mechanism: a wrapper job calls Graphite's API and emits a boolean. Dependent jobs gate on it.

**GitHub Actions sketch:**

```yaml
jobs:
  optimize_ci:
    runs-on: ubuntu-latest
    outputs:
      skip: ${{ steps.check.outputs.skip }}
    steps:
      - id: check
        run: |
          # Call Graphite's CI optimization API; set steps.check.outputs.skip
          ...

  test:
    needs: optimize_ci
    if: needs.optimize_ci.outputs.skip == 'false'
    runs-on: ubuntu-latest
    steps: ...
```

**Buildkite:** either a dedicated "Stack CI Optimizer" pipeline that runs before others (recommended), or an optimizer job at the start of each pipeline.

### Guardrails — when optimization is bypassed

CI runs unconditionally if:

- The API request to Graphite fails or is malformed.
- CI Optimizations are disabled at the repo level.
- The PR is in a merge queue, or the stack is being merged through Graphite.

This is the safe-by-default posture — a broken optimizer never silently skips CI.

### Watch out for

- **Branch protection on non-trunk branches**: if you set required checks on branches other than trunk, optimization-skipped PRs will show as "missing required CI." Either limit required checks to trunk, or accept that intermediate PRs will appear non-compliant until their dependencies merge.
- **Small teams**: with fewer than ~10 active stackers, the wall-clock savings are negligible. Don't add the complexity unless the cost is real.
- **Other levers first**: split workflows by scope (all PRs / excluding upstack / post-merge only); use Bazel / Turborepo / Nx to skip unaffected work; lean on merge queue batching (savings ≈ batch size × stack height).

Source: [stacking-and-ci](https://graphite.com/docs/stacking-and-ci).

## Enterprise / IP allowlisting

For orgs with GitHub IP allowlists:

- **Recommended**: enable "Allow access by GitHub Apps" at both the org and enterprise levels — Graphite is a GitHub App, so this is one toggle.
- **Manual**: allowlist Graphite's 23 documented IPs at both the org and enterprise security layers. Higher maintenance — only do this if app-level access is forbidden by policy.

## Operating principles for Claude

- When the user reports a Graphite merge or push failure, **ask for / check the branch protection settings first** before touching the CLI — most failures here trace back to "dismiss stale approvals" or the branch-push limit.
- Never recommend enabling required status checks on non-trunk branches **and** CI Optimizations at the same time without flagging the interaction.
- When proposing a `branches-ignore: "**/graphite-base/**"` change, read the existing workflow first — some workflows use `branches:` explicitly and need a different shape.
- When the user asks about "the merge queue," disambiguate: GitHub's native, Graphite's, or external? Each has a different setup and they are mutually exclusive.
- Cite the source page (one of the four links above) when proposing a config change so the user can verify.
