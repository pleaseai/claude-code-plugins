# Gatekeeper v2: All-Tool Coverage + Auto-Mode Rules

> Track: gatekeeper-v2-20260331
> Issue: pleaseai/claude-code-plugins#135

## Overview

Extend Gatekeeper from Bash-only coverage to all Claude Code tools and introduce a 3-tier decision system (hard_deny / soft_deny / allow) based on Claude Code's built-in auto-mode classifier. Improve the PermissionRequest AI prompt with intent judgment and comprehensive security rules derived from auto-mode defaults analysis.

## Requirements

### Functional Requirements

- [ ] FR-1: Implement 3-tier decision system — `hard_deny` (exit code 2, immediate block), `soft_deny` (passthrough to PermissionRequest AI), `allow` (instant approve)
- [ ] FR-2: Define soft_deny rules for Bash — git force push, push to main, hard reset, git clean, npm publish, terraform/kubectl apply, self-modification (.claude/settings, CLAUDE.md), --no-verify, chmod 777, exposed services, unauthorized persistence, permission grants, logging tampering
- [ ] FR-3: Extend PreToolUse to handle Write/Edit tools — project-relative paths allowed, `.env`/`.claude/settings`/CI configs soft_deny
- [ ] FR-4: Extend PreToolUse to handle WebFetch tool — paste services and script downloads soft_deny
- [ ] FR-5: Add safe tools instant-allow list — Read, Glob, Grep, TaskCreate, and other read-only tools
- [ ] FR-6: Add missing Bash hard_deny rules from auto-mode analysis
- [ ] FR-7: Add missing Bash ALLOW rules — declared dependency install (npm install without args), toolchain bootstrap patterns
- [ ] FR-8: Update PermissionRequest prompt with full auto-mode coverage: intent judgment, soft_deny context, 25+ DENY rules, 7 ALLOW rules, tool-specific guidance
- [ ] FR-9: Change both hook matchers from `"Bash"` to `""` (all tools)
- [ ] FR-10: Evaluate and switch PermissionRequest model from sonnet to haiku
- [ ] FR-11: Rewrite README.md to document 3-tier system, all-tool coverage, soft_deny rules, and updated architecture diagram

### Non-functional Requirements

- [ ] NFR-1: Layer 1 (PreToolUse) must remain <5ms — static pattern matching only, no AI calls
- [ ] NFR-2: No RegExp `g` flag on any pattern (existing invariant)
- [ ] NFR-3: Existing DENY/ALLOW behavior for Bash commands must not regress

## Acceptance Criteria

- [ ] AC-1: `hard_deny` commands (rm -rf /, mkfs, dd) are blocked immediately with stderr message
- [ ] AC-2: `soft_deny` commands (git push --force, npm publish, kubectl apply) pass through to PermissionRequest AI hook
- [ ] AC-3: Write/Edit to `.env` or `.claude/settings` triggers soft_deny (passthrough to AI)
- [ ] AC-4: Write/Edit to project-relative paths is instantly allowed
- [ ] AC-5: Safe tools (Read, Glob, Grep) are instantly allowed without AI review
- [ ] AC-6: Unknown tools pass through to PermissionRequest (fail-open)
- [ ] AC-7: PermissionRequest AI prompt judges user intent ("did the user explicitly request this?")
- [ ] AC-8: All existing tests pass without modification
- [ ] AC-9: New tests cover hard_deny, soft_deny, and allow classifications for all tool types
- [ ] AC-10: README.md accurately reflects the new 3-tier architecture

## Out of Scope

- Sandbox integration (complementary but separate concern)
- PostToolUse hooks (this track focuses on PreToolUse + PermissionRequest)
- Custom user rule configuration (future enhancement)
- Per-project rule overrides

## Assumptions

- The issue comment's gap analysis (7 ALLOW + 25 SOFT_DENY auto-mode rules) is the authoritative reference for rule coverage
- `soft_deny` returns null from PreToolUse, which causes Claude Code to proceed to PermissionRequest hook
- The `@anthropic-ai/claude-agent-sdk` types support the current hook protocol
- haiku model is sufficient for Layer 2 classification (to be validated in FR-10)
