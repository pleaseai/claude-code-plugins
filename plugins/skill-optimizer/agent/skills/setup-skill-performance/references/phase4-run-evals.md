# Phase 4: Configure and Run Evals

This phase covers two distinct eval types. Both apply to every plugin (single-skill and multi-skill alike).

- **Activation eval** (`--skip-forced-context-activation --skip-scoring`): observes which skill self-activates per scenario. Does NOT force activation. Tests routing/description quality. Fast — completes in ~2–3 min.
- **Content eval** (the default): forces activation, runs the agent twice (baseline + with-context), scores the rubric. Tests content quality. Slow — ~10–15 min per scenario per agent.

**Ordering:** for multi-skill plugins run activation first (catches routing problems before scored time is invested); for single-skill plugins either order is fine, parallel works too. Both are required — the variable is ordering, not whether to run them.

---

## Phase 4a: Activation eval

```bash
tessl eval run <plugin-path> --skip-forced-context-activation --skip-scoring --label <run-label>
```

This completes in ~2–3 min (no agent execution needed). Note the eval run URL from the output and share it with the user.

Activation results are reviewed in Phase 5 — they do not produce a numeric score; they produce a per-scenario firing pattern (which skill, if any, fired on each scenario). Pair them with content-eval baseline scores to distinguish "no activation but agent handles it fine" from "no activation and agent needs help" (a real routing gap).

Poll for completion as described in §Polling below.

---

## Phase 4b: Content (task) eval

### Choose agents and models

For a first run, recommend keeping it simple:

> "For a first run, I recommend a single agent to keep eval time manageable (~10–15 minutes per scenario). Once you've validated the scenarios are good, you can compare more agents.
>
> Want to go with one agent, or compare several now?
>
> Run `tessl eval run --list-agents` to see the supported `agent:model` values and the current default. Each additional agent is a separate run, so it multiplies eval time and cost."

`--agent` takes a **single** `agent:model`. To compare agents or models, run `tessl eval run` **once per agent** — there is no multi-`--agent` form.

### Env var injection (optional)

If the skill involves external service calls — APIs, databases, MCPs, third-party tools — and the user has secrets to inject, they can pass an env file to the sandbox:

```bash
tessl eval run <plugin-path> --env-file <path-to-env-file> --agent=<agent:model> --label <run-label>
```

Ask the user whether they have an env file when the plugin clearly exercises external services. Scenarios that don't need secrets run fine without it.

### Run the eval

Single agent:
```bash
tessl eval run <plugin-path> --agent=<agent:model> --label <run-label>
```

Comparing agents — one invocation each, with a distinct `--label`:
```bash
tessl eval run <plugin-path> --agent=claude:claude-sonnet-4-6 --label <run-label-sonnet>
tessl eval run <plugin-path> --agent=claude:claude-opus-4-8 --label <run-label-opus>
```

Note each eval run URL from the output and share it with the user so they can optionally watch progress in the browser.

---

## Polling for completion (both eval types)

```bash
tessl eval list --mine --limit 1
```

For **content evals**, runs take ~10–15 minutes per scenario per agent. Each scenario runs twice (baseline without context + with-context). Update the user periodically:

> "Evals are running... Status: in_progress. With N scenarios and 1 agent, expect about X–Y minutes total. I'll check again shortly."

For **activation evals**, expect ~2–3 min total — much faster polling.

Wait until status shows `completed`. If status shows `failed`, run:
```bash
tessl eval retry <id>
```

