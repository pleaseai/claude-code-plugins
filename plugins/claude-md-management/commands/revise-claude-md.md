---
description: Update CLAUDE.md with learnings from this session
allowed-tools: Read, Edit, Glob
---

Review this session for learnings about working with Claude Code in this codebase. Update CLAUDE.md with context that would help future Claude sessions be more effective.

## Step 1: Reflect

What context was missing that would have helped Claude work more effectively?
- Bash commands that were used or discovered
- Code style patterns followed
- Testing approaches that worked
- Environment/configuration quirks
- Warnings or gotchas encountered

## Step 2: Find CLAUDE.md Files and Project Rules

```bash
# CLAUDE.md files
find . \( -name "CLAUDE.md" -o -name ".claude.md" -o -name ".claude.local.md" \) 2>/dev/null | head -20

# Project rules
find ./.claude/rules -name "*.md" 2>/dev/null
```

Decide where each addition belongs:
- `CLAUDE.md` - Team-shared (checked into git)
- `.claude.local.md` - Personal/local only (gitignored)
- `.claude/rules/*.md` - Modular, topic-specific rules (path-based loading)

## Step 3: Draft Additions

**Keep it concise** - one line per concept. CLAUDE.md is part of the prompt, so brevity matters.

Format: `<command or pattern>` - `<brief description>`

**CLAUDE.md vs Rules decision:**
- CLAUDE.md: Global instructions (applies to entire project)
- .claude/rules/*.md: Path-specific instructions (use `paths:` frontmatter)

**Rules Frontmatter example:**
```yaml
---
paths: src/api/**/*.ts,src/services/**/*.ts
---
```
> Note: `paths:` uses comma-separated format (not YAML array)

Avoid:
- Verbose explanations
- Obvious information
- One-off fixes unlikely to recur
- Content that duplicates existing rules

## Step 4: Show Proposed Changes

For each addition:

```
### Update: ./CLAUDE.md

**Why:** [one-line reason]

\`\`\`diff
+ [the addition - keep it brief]
\`\`\`
```

For new rules file:

```
### Create: ./.claude/rules/api-patterns.md

**Why:** API development patterns apply only to specific paths

\`\`\`yaml
---
paths: src/api/**/*.ts
---

# API Development Rules

- Use dependency injection pattern
- All endpoints must have OpenAPI docs
\`\`\`
```

## Step 5: Apply with Approval

Ask if the user wants to apply the changes. Only edit files they approve.
