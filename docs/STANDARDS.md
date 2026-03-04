# STANDARDS.md

Problem definition → small, safe change → change review → refactor — repeat the loop.

## Mandatory Rules

- Before changing anything, read the relevant files end to end, including all call/reference paths.
- Keep tasks, commits, and PRs small.
- If you make assumptions, record them in the Issue/PR/ADR.
- Never commit or log secrets; validate all inputs and encode/normalize outputs.
- Avoid premature abstraction and use intention-revealing names.
- Apply YAGNI principle: “You Aren’t Gonna Need It” - don’t build features until they’re actually needed.
- Compare at least two options before deciding.

## Mindset

- Think like a senior engineer.
- Don’t jump in on guesses or rush to conclusions.
- Always evaluate multiple approaches; write one line each for pros/cons/risks, then choose the simplest solution.
- Record assumptions in the Issue, PR, or ADR.

## Code & File Reference Rules

- Read files thoroughly from start to finish (no partial reads).
- Before changing code, locate and read definitions, references, call sites, related tests, docs/config/flags.
- Do not change code without having read the entire file.
- Before modifying a symbol, run a global search to understand pre/postconditions and leave a 1–3 line impact note.

## Required Coding Rules

- Before coding, write a Problem 1-Pager: Context / Problem / Goal / Non-Goals / Constraints.
- Enforce limits: file ≤ 500 LOC, function ≤ 50 LOC, parameters ≤ 5, cyclomatic complexity ≤ 10, cognitive complexity ≤ 15. If exceeded, split/refactor.
- Prefer explicit code; no hidden “magic.”
- Follow DRY, but avoid premature abstraction.
- Isolate side effects (I/O, network, global state) at the boundary layer.
- Catch only specific exceptions and present clear user-facing messages.
- Use structured logging and do not log sensitive data (propagate request/correlation IDs when possible).
- Account for time zones and DST.

## Testing Rules

- New code requires new tests; bug fixes must include a regression test (write it to fail first).
- Tests must be deterministic and independent; replace external systems with fakes/contract tests.
- Include ≥1 happy path and ≥1 failure path in e2e tests.
- Proactively assess risks from concurrency/locks/retries (duplication, deadlocks, etc.).

## Security Rules

- Never leave secrets in code/logs/tickets.
- Validate, normalize, and encode inputs; use parameterized operations.
- Apply the Principle of Least Privilege.

## Clean Code Rules

- Use intention-revealing names.
- Each function should do one thing.
- Keep side effects at the boundary.
- Prefer guard clauses first.
- Symbolize constants (no hardcoding).
- Structure code as Input → Process → Return.
- Report failures with specific errors/messages.
- Make tests serve as usage examples; include boundary and failure cases.

## Surgical Changes

Modify only what’s necessary. Respect existing code.

- **Don’t refactor unrelated code** — even if it looks messy, resist the urge unless explicitly asked.
- **Preserve existing style** — match indentation, naming, and formatting of surrounding code.
- **Don’t restyle or reformat** — changing whitespace, import order, or quotes in untouched code creates noise.
- **Remove only what your changes orphaned** — delete imports/functions that YOUR change made unused.
- **Flag pre-existing dead code** — leave a comment or mention in PR, don’t delete without being asked.

## Managing Assumptions

Surface uncertainty instead of silently choosing an interpretation.

- **State assumptions explicitly** before proceeding: “I’m assuming X because Y”
- **Present multiple interpretations** when requirements are ambiguous
- **Ask for clarification** rather than guessing — especially for business logic
- **Push back** when a request seems like it would introduce unnecessary complexity

## AI Collaboration Warning Signs

Stop and revert immediately when you observe any of these signals:

| Warning Sign | Description | Response |
|---|---|---|
| **Loops** | AI repeats the same approach 3+ times without progress | Stop. Re-analyze the problem and try a different strategy |
| **Unrequested functionality** | AI adds features or code not asked for | Revert immediately. Keep scope to the current task only |
| **Test manipulation** | AI modifies or deletes tests to make code pass | Never allowed. If the test is correct, fix the code |
| **Silent architecture decisions** | AI selects patterns or libraries without disclosure | Stop. Ask AI to present options, then decide explicitly |

## Anti-Pattern Rules

- Don’t modify code without reading the whole context.
- Don’t expose secrets.
- Don’t ignore failures or warnings.
- Don’t introduce unjustified optimization or abstraction.
- Don’t overuse broad exceptions.
- Don’t refactor unrelated code — noisy diffs make reviews harder.
- Don’t make silent assumptions — state them explicitly or ask.