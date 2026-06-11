# Bug Fix: setup command fails to find root package.json

> Track: fix-setup-glob-pattern-20260329
> Investigation: [investigation.md](./investigation.md)

## Overview

The `/please-plugins:setup` command instructs Claude to "Read `package.json` in the current working directory" (line 12), but this ambiguous instruction allows Claude to use the Glob tool first. In projects with `node_modules/`, hundreds of nested `package.json` files bury the root file beyond the Glob result limit (250), making the setup command unusable.

## Reproduction

1. Open any project with `node_modules/` directory
2. Run `/please-plugins:setup`
3. Claude Globs for `package.json`, gets 250+ results sorted by mtime
4. Root `package.json` is truncated from results
5. Command fails: "package.json not found" or reads wrong file

**Expected**: Setup reads root `./package.json` directly and scans dependencies
**Actual**: Setup fails to find or reads wrong `package.json`

## Root Cause

`setup.md:12` uses ambiguous prose ("Read `package.json`") without constraining tool choice or path. The TypeScript hook `check-dependencies.ts` already handles this correctly with `join(cwd, 'package.json')` — the command reimplements the same logic as fragile LLM instructions.

## Requirements

### Functional Requirements

- [ ] FR-1: Refactor `setup.md` Step 1 to delegate dependency scanning to the existing `check-dependencies.ts` script rather than reimplementing in natural language
- [ ] FR-2: Ensure the script outputs structured JSON that the command can parse and display
- [ ] FR-3: Fix any other ambiguous file-read instructions in `setup.md` (e.g., `.claude/settings.json` in Step 2)

### Testing Requirements

- [ ] TR-1: Verify setup works in a project with `node_modules/` present
- [ ] TR-2: Verify setup works in a project without `node_modules/`
- [ ] TR-3: Verify setup works when `package.json` doesn't exist (graceful error)

## Acceptance Criteria

- [ ] AC-1: `/please-plugins:setup` reliably finds root `package.json` regardless of `node_modules/` presence
- [ ] AC-2: All existing `check-dependencies.test.ts` tests continue to pass
- [ ] AC-3: Setup command uses script delegation instead of ambiguous LLM instructions for file discovery

## Out of Scope

- Rewriting `check-dependencies.ts` internals
- Adding new plugin mappings
- Changes to the hook system itself
- Monorepo workspace scanning (separate track)
