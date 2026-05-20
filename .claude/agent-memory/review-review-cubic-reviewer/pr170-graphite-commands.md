---
name: Graphite commands review (PR #170)
description: cubic review of 4 markdown docs in plugins/graphite/commands/ — 1 false positive flagged about gt create positional arg
metadata:
  type: project
---

PR #170 (graphite plugin) — review-fix pass after gemini + cubic bot feedback on first push. Four markdown files changed: create.md, fold.md, modify.md, squash.md.

cubic found 1 issue (P1):
- `plugins/graphite/commands/create.md:15` — "Incorrect `gt create` invocation for single-token input": cubic claimed there is no positional branch-name argument for `gt create`.

**Verdict: false positive.** `gt create --help` confirms the CLI signature is `gt create [name]` where `[name]` is an optional positional branch-name argument. The doc's `gt create -am "<message>" $ARGUMENTS` is valid syntax when `$ARGUMENTS` is a single branch-name token.

No fixes were applied. Review state saved at commit bea558f.

**Why:** cubic hallucinated a constraint ("branch names are derived from message only") that conflicts with the actual CLI help text.

**How to apply:** When cubic flags `gt` CLI invocations as invalid, verify against `gt <subcommand> --help` before accepting the issue. cubic has a pattern of not knowing the full `gt` CLI surface.
