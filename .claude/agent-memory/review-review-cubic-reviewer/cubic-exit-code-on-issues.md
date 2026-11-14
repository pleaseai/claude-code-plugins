---
name: cubic-exit-code-on-issues
description: cubic review -j exits 1 when it reports issues; that is a findings signal, not a failure. Also cubic line numbers can drift from the real line.
metadata:
  type: reference
---

`cubic review -j` returns exit status 1 whenever the JSON contains issues, even though the JSON is valid and complete. Treat a parseable `issues` array as a successful run with findings. Only stop and report when the output is not valid JSON or cubic prints an error.

Cubic's reported `line` can be off from the actual line in the file (PR-less working-tree run on plugins/port/skills/port/SKILL.md reported line 44 for text on line 40). Re-read the file at the reported line before presenting it, and quote the real line.

**Why:** the non-zero exit looks like an error if the caller only checks exit codes.
**How to apply:** check for valid JSON first, then the issues array. Verify each `file:line` against the working tree before reporting.
