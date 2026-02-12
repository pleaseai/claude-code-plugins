---
description: Run Cubic AI code review on current changes. Detects bugs, security vulnerabilities, and style issues. Usage - /cubic:review [--base main] [--commit HEAD~1] [--prompt "focus area"]
allowed-tools: Bash, Read, Edit
---

# Cubic AI Code Review

Run an AI-powered code review using Cubic CLI and apply fixes.

## Workflow

### Step 1: Determine review scope

Analyze `$ARGUMENTS` to determine the review mode:

| User Intent | Command |
|-------------|---------|
| Review uncommitted changes (default) | `cubic review --json` |
| Review branch diff against base | `cubic review --base --json` or `cubic review --base main --json` |
| Review specific commit | `cubic review --commit <ref> --json` |
| Review with custom focus | `cubic review --prompt "<instructions>" --json` |

If `$ARGUMENTS` is empty, default to reviewing uncommitted changes.

### Step 2: Run Cubic review

Execute the appropriate command via Bash. Always include `--json` for structured output.

```bash
cubic review --json
```

If cubic is not installed, inform the user:

```
cubic CLI is not installed. Install it with:
  curl -fsSL https://cubic.dev/install | bash
  # or: npm install -g @cubic-dev-ai/cli
```

### Step 3: Parse and analyze results

Parse the JSON output. Each issue contains:
- `priority`: Severity level (P0 = critical, P1 = high, P2 = medium, P3 = low)
- `file`: File path where the issue was found
- `line`: Line number of the issue
- `title`: Brief description of the issue
- `description`: Detailed explanation

### Step 4: Present findings

Summarize the review results grouped by priority:

```
=== Cubic Review Results ===

Found N issues (X critical, Y high, Z medium, W low)

[P0] file:line - title
  description

[P1] file:line - title
  description

...
```

### Step 5: Offer to fix issues

For each P0 and P1 issue:
1. Read the referenced file at the specified line
2. Propose a fix
3. Apply the fix using Edit if the user agrees

For P2/P3 issues, list them as suggestions without automatically fixing.

### Step 6: Verify fixes

After applying fixes, re-run `cubic review --json` to confirm issues are resolved.

```
=== Cubic Review Complete ===

Scope: <uncommitted changes | branch diff | commit review>
Issues found: N
Issues fixed: M
Remaining: N-M
```

<user-request>
$ARGUMENTS
</user-request>
