# Phase 3: Fixtures and setup scripts

Eval scenarios start in an empty working directory unless they declare environment preparation. Two kinds exist:

- **Fixtures** — static context installed into the working directory before the agent runs. Declared as a named record under `fixtures` in `scenario.json`.
- **Setup scripts** — shell scripts that run after fixtures install and before the agent task begins. Either declared as `setup: ["./setup.sh"]` in `scenario.json`, or auto-detected from a `setup.sh` placed next to the scenario.

This reference covers when each is needed, how to source/generate them transparently — always telling the user what you're inspecting and getting explicit confirmation before anything is written or run — and the skip rules that protect user intent.

## Schema reminder

A `scenario.json` with both kinds of preparation looks like:

```json
{
  "fixtures": {
    "codebase": {
      "type": "commit",
      "repoUrl": "https://github.com/acme/example.git",
      "ref": "main"
    }
  },
  "setup": ["./setup.sh"]
}
```

Fixture types:
- `commit` — `{ type: "commit", repoUrl, ref, installPath?, exclude? }` — git snapshot at a ref.
- `directory` — `{ type: "directory", path, installPath }` — local directory copied in.

## Detection rules

For each scenario, read its `task.md`, `criteria.json`, and the parent plugin's `SKILL.md` / `docs/` to classify needs.

### Fixture-warranted signals

Fire if **any** of these apply:
- The plugin's `SKILL.md` talks about modifying or refactoring existing code, or uses phrases like "this codebase", "your repo", or names file paths the user is expected to edit.
- The scenario's `task.md` references files that must already exist — e.g. "fix the bug in `src/foo.ts`", "update the migration in `db/`".
- The rubric in `criteria.json` checks for edits to existing files rather than from-scratch creation.

### Setup-script-warranted signals

Fire if **any** of these apply:
- The plugin mentions an external CLI or dependency the agent must run (`npm install`, `pip install`, `brew install`, `cargo build`).
- The task assumes a running service, database, or migration state that can't be expressed as static files.

**Note on env vars and credentials:** these do not require a setup script. They are injected at the eval run level via `tessl eval run --env-file <path>`. Ask the user whether they have an env file when the plugin calls external services — do not generate a setup script solely for env var injection.

### Skip rules (always honour user intent)

Do **not** generate or overwrite when:
- `scenario.json` already declares a `fixtures` record — leave it alone.
- `scenario.json` already declares `setup`, **or** a `setup.sh` already exists next to the scenario — leave it alone.

Skip rules apply per-scenario. A plugin with five scenarios may need fixture generation on three of them and nothing on the other two.

## Fixture sourcing — with user confirmation

When the fixture signal fires for a scenario, your job is to **help the user** decide what context the scenario needs and where it should come from. Never auto-discover a source and write it into `scenario.json` without the user's knowledge — a fixture can cause the eval runner to `git clone` a remote repo at runtime, so the user must knowingly approve it.

1. **Tell the user you're going to look for fixture context, then look.** Say what you're inspecting before you do it, e.g.:

   > "Scenario `<slug>` looks like it needs an existing codebase to operate on. I'm going to check the plugin's `SKILL.md`, `docs/`, and `README.md` for a suitable source — including any `https://github.com/…` or `git@github.com:…` repo URLs, and any sample directories like `examples/` or `fixtures/`."

   Then read those files. A candidate is a repo URL together with an obvious ref (branch, tag, or commit), or a sample directory path inside the plugin. Synthetic fixtures (context you'd construct rather than pull from a repo) are also fair game — call that out too.

2. **Compile the candidates and present them for explicit confirmation.** Before writing anything into `scenario.json`, show the user the list of candidate files / URLs you found (or the synthetic fixture you propose), and ask them to confirm. Approval must cover **both**:
   - (a) including the fixture in `scenario.json`, and
   - (b) that the eval runner may **`git clone` / fetch it at eval runtime** (for `commit`-type fixtures).

   > "For scenario `<slug>` I found these candidate sources:
   > - `https://github.com/acme/example.git` @ `main` (from `SKILL.md`)
   > - `examples/` (local directory in the plugin)
   >
   > If you approve, I'll add a fixture to `scenario.json`. Note that a `commit` fixture means the eval runner will git-clone that repo at eval time. Which (if any) should I use?"

3. **Only after explicit approval**, write it into `scenario.json` under `fixtures.<name>` using the schema above. Name the fixture descriptively — `codebase` for the primary repo snapshot is conventional; use `examples` or similar for directory fixtures.

4. **If the user declines, or no suitable source exists**, skip fixture generation for that scenario, record it in the pre-run summary, and continue. Do not stop the phase — the user has explicitly opted into a degraded eval.

Asking is the default, not the fallback. Always surface what you found and let the user decide.

## Setup-script generation

A `setup.sh` runs shell commands (e.g. `npm install`) on the user's machine at eval time. Never generate one and silently make it executable — the user must see the exact script contents and approve them before it can run.

When the setup-script signal fires for a scenario:

1. **Draft `setup.sh`** — the minimum init commands implied by the signal. Include a shebang on the first line — the scenario lint rule warns without it.

   ```bash
   #!/bin/bash
   set -euo pipefail

   npm install
   ```

2. **Show the user the full script contents for review and get approval before it can run.** The eval runner executes any `setup.sh` placed next to the scenario, so the script must not become runnable until the user has seen exactly what it does:

   > "Scenario `<slug>` looks like it needs setup before the agent runs. I'd like to add this `setup.sh` next to the scenario — the eval runner will execute it on your machine at eval time:
   >
   > ```bash
   > #!/bin/bash
   > set -euo pipefail
   > npm install
   > ```
   >
   > Approve this script, edit the commands, or skip setup for this scenario?"

3. **Only after the user approves**, write the file next to the scenario (same directory as `scenario.json` / `task.md`) and `chmod +x setup.sh` so the eval runner can execute it. If they edit the commands, write their version; if they skip, record it in the pre-run summary and move on.

## Pre-run summary

After processing all scenarios — and **before** kicking off `tessl eval run` — show the user one concise summary so they can catch wrong inferences early:

```
Generated 2 fixtures and 1 setup script across 4 scenarios.
  - checkout-flow: fixture (commit: acme/example#main), setup.sh (npm install)
  - webhook-setup: fixture (commit: acme/example#main)
  - custom-scenario: fixture (user-declared), setup.sh (user-declared)
  - empty-state: no preparation needed
```

For scenarios where skip rules fired (a `fixtures` record, `setup` array, or `setup.sh` was already present), list each as `user-declared` rather than `no preparation needed`, so the user can confirm their declarations were respected and catch any mismatches.

If any scenario was skipped because the user declined to provide a source, list it here so the user knows the eval will run that scenario in an empty workdir.

