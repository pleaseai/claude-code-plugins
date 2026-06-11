---
name: Mastra skill review (PR #161)
description: cubic review result for PR #161 adding use-mastra workflow skill; clean after two prior correctness fixes
type: project
---

PR #161 (branch: amondnet/use-mastra-skill) adds `plugins/mastra/.agents/skills/use-mastra/` with SKILL.md, packages.md, agents-and-workflows.md, and common-errors.md.

Two fixes were applied before this cubic run:
1. `agent.generate(...)` updated to nested `memory: { thread, resource }` (deprecated top-level `threadId`/`resourceId` removed) in agents-and-workflows.md and common-errors.md.
2. `createTool` → `createVectorQueryTool` for the RAG vector-query recipe in agents-and-workflows.md.

**Why:** Mastra API changed — top-level threadId/resourceId are deprecated; correct vector query tool name is createVectorQueryTool.

cubic result: 0 issues (clean pass). Review state saved at commit b8b4eb5.

**How to apply:** When reviewing Mastra skill files, watch for deprecated memory API patterns and incorrect tool names as common false-positive-free issues cubic catches.
