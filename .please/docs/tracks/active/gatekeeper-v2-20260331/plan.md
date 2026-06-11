# Plan: Gatekeeper v2 — All-Tool Coverage + Auto-Mode Rules

> Track: gatekeeper-v2-20260331
> Spec: [spec.md](./spec.md)

## Overview

- **Source**: pleaseai/claude-code-plugins#135
- **Issue**: #135
- **Created**: 2026-03-31
- **Approach**: Modular Classifier — extend existing pattern-matching architecture with 3-tier decisions and per-tool classifiers

## Purpose

After this change, Claude Code users with Gatekeeper installed will have comprehensive security coverage across all tools (not just Bash). They can verify it works by observing that Write/Edit to `.env` triggers an AI review, while Read/Glob are instantly allowed, and `rm -rf /` is still hard-blocked.

## Context

Gatekeeper v1 only covers Bash commands, leaving Write, Edit, WebFetch, Agent and other tools unprotected. All denials are treated equally — there's no distinction between absolutely dangerous commands (rm -rf /) and commands that are dangerous but sometimes intentionally requested (git push --force). Analysis of Claude Code's built-in auto-mode classifier (`yoloClassifier.ts`) reveals a comprehensive 25+ rule set for DENY decisions and 7 ALLOW rules that Gatekeeper should match for full coverage.

The issue comment provides a detailed gap analysis showing current coverage at ~40% for SOFT_DENY rules and ~57% for ALLOW rules. The goal is 100% coverage of auto-mode defaults through a combination of Layer 1 static rules and Layer 2 AI prompt improvements.

Key constraints: Layer 1 must remain <5ms (no AI calls), existing Bash DENY/ALLOW behavior must not regress, and the `g` flag must not be used on RegExp patterns.

## Architecture Decision

**Chosen approach: Modular Classifier Pattern**

The existing `pre-tool-use.ts` architecture (DENY_RULES → ALLOW_RULES → passthrough) extends naturally to a 3-tier system. Rather than a full rewrite, we rename `DENY_RULES` to `HARD_DENY_RULES`, add `SOFT_DENY_RULES`, and introduce per-tool classifier functions that dispatch from the main `evaluate()` function based on `tool_name`. The `chain-parser.ts` remains unchanged as it handles only shell command parsing.

For soft_deny, returning `null` from the PreToolUse hook causes Claude Code to proceed to the PermissionRequest hook, where the AI agent evaluates user intent. This matches the issue's proposed flow exactly.

The PermissionRequest prompt is rewritten with the full auto-mode rule set from the issue comment, structured as Core Principle (intent judgment) → ALLOW rules → hard DENY rules → soft DENY rules → tool-specific guidance.

## Tasks

- [x] T001 Refactor DENY_RULES to HARD_DENY_RULES and add SOFT_DENY_RULES for Bash (file: plugins/gatekeeper/src/pre-tool-use.ts)
- [x] T002 Add Write/Edit classifier with path-based rules (file: plugins/gatekeeper/src/pre-tool-use.ts) (depends on T001)
- [x] T003 Add WebFetch classifier with URL-based rules (file: plugins/gatekeeper/src/pre-tool-use.ts) (depends on T001)
- [x] T004 Add safe tools instant-allow list and refactor evaluate() dispatcher (file: plugins/gatekeeper/src/pre-tool-use.ts) (depends on T001)
- [x] T005 Add tests for 3-tier Bash decisions (hard_deny, soft_deny, allow) (file: plugins/gatekeeper/src/pre-tool-use.test.ts) (depends on T001)
- [x] T006 [P] Add tests for Write/Edit classifier (file: plugins/gatekeeper/src/pre-tool-use.test.ts) (depends on T002)
- [x] T007 [P] Add tests for WebFetch classifier (file: plugins/gatekeeper/src/pre-tool-use.test.ts) (depends on T003)
- [x] T008 [P] Add tests for safe tools allowlist and unknown tool passthrough (file: plugins/gatekeeper/src/pre-tool-use.test.ts) (depends on T004)
- [x] T009 Rewrite PermissionRequest prompt with full auto-mode coverage and intent judgment (file: plugins/gatekeeper/hooks/hooks.json) (depends on T004)
- [x] T010 Update hook matchers from Bash to empty string and evaluate model change (file: plugins/gatekeeper/hooks/hooks.json) (depends on T009)
- [x] T011 Rewrite README.md with 3-tier architecture, all-tool coverage tables, and soft_deny documentation (file: plugins/gatekeeper/README.md) (depends on T010)
- [x] T012 Build dist bundle and verify all tests pass (depends on T005, T006, T007, T008, T010)

## Key Files

### Modify

- `plugins/gatekeeper/src/pre-tool-use.ts` — Main hook logic: add 3-tier system, per-tool classifiers, safe tools allowlist
- `plugins/gatekeeper/src/pre-tool-use.test.ts` — Tests: add soft_deny, Write/Edit, WebFetch, safe tools test suites
- `plugins/gatekeeper/hooks/hooks.json` — Hook config: update matchers, rewrite PermissionRequest prompt, evaluate model
- `plugins/gatekeeper/README.md` — Documentation: full rewrite with 3-tier architecture

### Reuse (unchanged)

- `plugins/gatekeeper/src/chain-parser.ts` — Shell parser: no changes needed
- `plugins/gatekeeper/package.json` — Build config: no changes needed
- `plugins/gatekeeper/CLAUDE.md` — Dev instructions: no changes needed

## Verification

### Automated Tests

- [ ] All existing Bash DENY/ALLOW tests pass unchanged (regression check)
- [ ] soft_deny Bash commands (git push --force, npm publish, kubectl apply) return null
- [ ] hard_deny Bash commands (rm -rf /, mkfs) return deny decision
- [ ] Write/Edit to .env returns null (soft_deny → AI review)
- [ ] Write/Edit to project-relative path returns allow decision
- [ ] WebFetch to paste services returns null (soft_deny → AI review)
- [ ] Read, Glob, Grep return allow decision (safe tools)
- [ ] Unknown tools return null (passthrough to AI)

### Observable Outcomes

- Running `echo '{"tool_name":"Bash","tool_input":{"command":"git push --force"}}' | node dist/pre-tool-use.js` produces no stdout (passthrough)
- Running `echo '{"tool_name":"Read","tool_input":{}}' | node dist/pre-tool-use.js` produces allow JSON
- Running `echo '{"tool_name":"Write","tool_input":{"file_path":".env"}}' | node dist/pre-tool-use.js` produces no stdout (passthrough to AI)

### Acceptance Criteria Check

- [ ] AC-1: hard_deny commands blocked immediately with stderr
- [ ] AC-2: soft_deny commands pass through to PermissionRequest AI
- [ ] AC-3: Write/Edit to .env/.claude/settings triggers soft_deny
- [ ] AC-4: Write/Edit to project paths instantly allowed
- [ ] AC-5: Safe tools instantly allowed
- [ ] AC-6: Unknown tools pass through (fail-open)
- [ ] AC-7: AI prompt judges user intent
- [ ] AC-8: All existing tests pass
- [ ] AC-9: New tests cover all classifications
- [ ] AC-10: README reflects new architecture

## Progress

- [x] (2026-03-31 21:40 KST) T001 Refactor DENY_RULES to HARD_DENY_RULES and add SOFT_DENY_RULES for Bash
- [x] (2026-03-31 21:40 KST) T002 Add Write/Edit classifier with path-based rules
- [x] (2026-03-31 21:40 KST) T003 Add WebFetch classifier with URL-based rules
- [x] (2026-03-31 21:40 KST) T004 Add safe tools instant-allow list and refactor evaluate() dispatcher
- [x] (2026-03-31 21:40 KST) T005 Add tests for 3-tier Bash decisions
- [x] (2026-03-31 21:40 KST) T006 Add tests for Write/Edit classifier
- [x] (2026-03-31 21:40 KST) T007 Add tests for WebFetch classifier
- [x] (2026-03-31 21:40 KST) T008 Add tests for safe tools allowlist and unknown tool passthrough
  Evidence: `bun test` → 246 pass, 0 fail, 835 assertions (51ms)
- [x] (2026-03-31 21:43 KST) T009 Rewrite PermissionRequest prompt with full auto-mode coverage
- [x] (2026-03-31 21:43 KST) T010 Update hook matchers from Bash to empty string, switch model to haiku
- [x] (2026-03-31 21:43 KST) T011 Rewrite README.md with 3-tier architecture
- [x] (2026-03-31 21:45 KST) T012 Build dist bundle and verify all tests pass
  Evidence: `bun build` → pre-tool-use.js 15.47 KB; `bun test` → 246 pass, 0 fail

## Decision Log

- Decision: Modular Classifier pattern — extend existing architecture rather than rewrite
  Rationale: Minimizes risk, preserves existing test coverage, clear migration path from 2-tier to 3-tier
  Date/Author: 2026-03-31 / Claude

- Decision: soft_deny returns null (passthrough) rather than a new decision type
  Rationale: Claude Code hook protocol already supports null = passthrough to next hook. No SDK changes needed.
  Date/Author: 2026-03-31 / Claude

## Surprises & Discoveries

- Observation: `\b` word boundary fails before `.` (non-word character) in regex patterns
  Evidence: `/\b\.claude\/settings/` never matches because `\b` requires word↔non-word boundary, but `.` preceded by space/start is non-word↔non-word. Fixed by using `(?:^|\s)` instead.

## Outcomes & Retrospective

### What Was Shipped
- 3-tier decision system (hard_deny / soft_deny / allow) in PreToolUse hook
- All-tool coverage: Bash, Write/Edit, WebFetch, safe tools allowlist
- Rewritten PermissionRequest AI prompt with full auto-mode coverage (7 ALLOW, 25+ DENY rules)
- Switched Layer 2 model from sonnet to haiku
- Comprehensive README rewrite

### What Went Well
- Existing test suite caught regression immediately when `evaluateSingleCommand` return type changed
- Modular classifier pattern allowed incremental implementation without breaking existing behavior
- Issue #135 with detailed gap analysis made rule coverage straightforward

### What Could Improve
- Regex word boundary behavior with non-word characters caught by review — could add a regex-specific test helper

### Tech Debt Created
- None identified
