---
description: Run or manage the SkillOpt-Sleep self-evolution cycle (review past sessions, replay tasks offline, consolidate validated memory + skills)
argument-hint: "[run | dry-run | status | adopt | harvest] (default: status)"
allowed-tools: Bash, Read
---

# /sleep — SkillOpt-Sleep nightly self-evolution

You are driving **SkillOpt-Sleep**: a tool that lets this user's Claude agent
improve offline by reviewing past sessions, replaying recurring tasks, and
consolidating what it learns into **validated** memory (`CLAUDE.md`) and skills
(`SKILL.md`). It is gated like SkillOpt: a change is kept only if it improves a
held-out replay score, and nothing live is modified until the user adopts it.

## Requested action: $ARGUMENTS

(If `$ARGUMENTS` is empty, treat it as `status`.)

## How to run it

The engine is the `skillopt_sleep` Python package in this repo. Use the
**plugin's bundled runner** so the right interpreter and repo are on the path:

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/sleep.sh" <action> --project "$(pwd)" --scope invoked
```

`<action>` is one of:

| action    | what it does |
|-----------|--------------|
| `status`  | show how many nights have run + the latest staged proposal (READ-ONLY) |
| `dry-run` | harvest → mine → replay → report, but **stage nothing** (safe preview) |
| `run`     | full cycle: also **stage** a reviewed proposal (still does NOT touch live files) |
| `adopt`   | apply the latest staged proposal to live `CLAUDE.md` / `SKILL.md` (backs up first) |
| `harvest` | debug: print the recurring tasks mined from recent sessions |

Default backend is `mock` (deterministic, no API spend). To use real Anthropic
budget for genuine improvement, add `--backend anthropic`.

## Steps to follow

1. **Run the requested action** via the bundled runner above. Capture stdout.
2. **For `run` / `dry-run`:** after it completes, `Read` the generated
   `report.md` in the staging dir it prints, and show the user:
   - held-out score: baseline → candidate (the proof it helped)
   - the gate decision (accept/reject) and the exact edits it proposes
   - where the proposal is staged
3. **For `run` that produced an accepted proposal:** tell the user the diff is
   staged and that **nothing live changed yet**. Offer to run `/sleep adopt`.
4. **For `adopt`:** confirm which live files were updated and that backups were
   written under the staging dir's `backup/`.
5. **Never** edit `CLAUDE.md` or `SKILL.md` yourself — only the `adopt` action
   does that, with a backup. Respect the review gate.

## Safety reminders

- Harvest is **read-only** over `~/.claude`. Replay in `mock` mode runs no
  shell side effects.
- The cycle stages proposals; the user is in control of adoption.
- If the user asks to schedule this nightly, point them at
  `${CLAUDE_PLUGIN_ROOT}/scripts/install-cron.sh` (prints a crontab line; does
  not install anything without confirmation).
