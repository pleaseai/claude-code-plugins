---
name: Code Review via Cubic CLI
description: Run AI-powered code reviews using Cubic CLI to detect bugs, security vulnerabilities, and style issues in local changes. Use when the user says "review my code," "check my changes for bugs," "run cubic review," "review this diff," "pre-commit check," "find issues before I push," "analyze my branch changes," or "code quality check." Triggers on mentions of cubic, code review, diff review, pre-commit checks, bug detection, and code quality validation.
allowed-tools: Bash, Read, Edit
---

# Cubic CLI - AI Code Review

Detect bugs, security issues, and code quality problems in local changes by running `cubic review` via Bash.

## When to Use

- User asks to review code changes, diffs, or branches
- Pre-commit quality checks or bug detection
- Security vulnerability scanning on changed files
- Code style and best practice validation
- Comparing branch changes before creating a PR

## Prerequisites

Cubic CLI must be installed. If `cubic` is not found in PATH, inform the user with installation options:
- `curl -fsSL https://cubic.dev/install | bash`
- `npm install -g @cubic-dev-ai/cli`

Do not run the installation command automatically. Let the user decide.

If cubic returns an authentication error, inform the user to run `cubic login` or complete browser-based authentication.

## CLI Quick Reference

Always pass `--json` for structured output. Key modes:

- `cubic review --json` -- review uncommitted changes (default)
- `cubic review --base main --json` -- compare against a branch (PR-style)
- `cubic review --commit HEAD~1 --json` -- review a specific commit
- `cubic review --prompt "focus area" --json` -- custom review focus

**Constraint**: `--base`, `--commit`, and `--prompt` are mutually exclusive.

## JSON Output Format

```json
{
  "issues": [
    {
      "priority": "P0",
      "file": "src/api/auth.ts",
      "line": 45,
      "title": "SQL injection vulnerability in user lookup",
      "description": "User input is concatenated directly into SQL query without parameterization."
    }
  ]
}
```

Priority levels: **P0** (critical) > **P1** (high) > **P2** (medium) > **P3** (low).

## Workflow

1. Run `cubic review --json` (or with `--base`/`--commit` as appropriate)
2. Parse the JSON output to identify issues
3. Sort issues by priority (P0 first)
4. For each issue, read the referenced file and line
5. Apply fixes using Edit tool, addressing highest priority issues first
6. Re-run `cubic review --json` to verify fixes

For the full command reference and step-by-step workflow, use `/cubic:review`.
