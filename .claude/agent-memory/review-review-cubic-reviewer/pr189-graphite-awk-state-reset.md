---
name: pr189-graphite-awk-state-reset
description: cubic clean pass (0 issues) on awk parser state-leakage fix in graphite-context.sh (PR #189)
metadata:
  type: project
---

PR #189: adds `; found_enabled=0; found_tool=0` resets to three existing state-reset points in `plugins/graphite/hooks/graphite-context.sh`. The change fixes a defensive state-leakage concern flagged by gemini-code-assist — awk `found_enabled`/`found_tool` variables were never reset between YAML blocks. cubic returned 0 issues on the staged diff. 18-case awk test battery (15 original + 3 pathological YAML cases) all pass; `bash -n` clean.
