---
name: optimize-skill-instructions
description: |
  Review and improve your skill with actionable recommendations. Reviews the whole bundle, validates syntax and references, explains rubric, shows before/after scores, and edits the SKILL.md and its reference docs. Use when reviewing skill quality, improving a SKILL.md or its reference files, checking scoring dimensions and quick wins, auditing progressive disclosure and orphaned bundle files, generating improvement recommendations, running a post-edit quality audit, creating approval-gated change proposals, or automating the skill review workflow. For the full optimization cycle (review + evals + improve), use `optimize-skill-performance-and-instructions`.
---

# Review Best Practices

Improve your skill using `tessl review run` plus validation and context: it reviews your full skill bundle, validates syntax, explains WHY changes help, and catches mistakes before applying.

For a hands-off, automated improve loop, use `tessl review fix` instead — see [Fast path: automated fix loop](#fast-path-automated-fix-loop).

## Guiding Principles

- A judge suggestion that conflicts with the skill's purpose should be discussed as a trade-off, not silently applied
- Don't invent rubric dimensions, score deltas, or `tessl review` flags — derive them from actual review output

## Workflow

### Phase 1: Baseline Evaluation

```bash
tessl review run <path-to-skill> --label "baseline"
```

Pass `--threshold <percent>` to exit non-zero below a score gate. Re-open the most recent result with `tessl review view --last`.

Parse output for scores, validation issues, and judge suggestions. Prioritize fixes:
**Critical** (ERRORs) → **High** (missing "Use when...", low actionability/conciseness) → **Medium** (other dimensions) → **Low** (warnings)

### Phase 2: Discover Skill Bundle

Read SKILL.md and list files in its directory. Bundle = SKILL.md + sibling files + referenced files. Check for orphaned files (see Progressive Disclosure section). Use bundle context to improve progressive disclosure.

### Phase 3: Generate Recommendations

For each issue, produce a recommendation block:

```
## [Action verb]: [what to change]

Dimension: [name] [current]/3 → [target]/3 (+Z% overall)

Before:
> [exact current text]

After:
> [exact replacement text]

Why: [one sentence: how this improves routing/clarity/actionability]
```

If bundle has reference files, recommend linking instead of inlining for progressive disclosure.

### Phase 4: Validate Recommendations

**CRITICAL: Validate before applying changes**

Run each validation step and show the output — do not just describe what you would run:
- Python: run `ast.parse` on any Python code blocks and show the output (including any SyntaxError details)
- JavaScript: run `node --check <file>` and show the result
- Commands: consult `--help` output to verify flags are valid
- Files: check that every referenced file path exists
- Frontmatter `description:` field: verify it contains a "Use when..." trigger clause (check the YAML header, not the body)
- Content: flag any concepts the agent already knows (explain nothing obvious)

See [REFERENCE.md](references/REFERENCE.md) for validation code snippets (Python `ast.parse`, JS `node --check`, bash file-reference checks). When producing an automation script, include each step as executable code (not comments).

### Phase 5: Present Recommendations

**Start with a priority summary table** before individual details:

```
Priority | Recommendation           | Score impact | Dimension
---------|--------------------------|-------------|----------
Critical | Add "Use when..." clause  | +15% overall | Completeness 0→3
High     | Remove HMAC explanation  | +8% overall  | Conciseness 1→2
Medium   | Add retry example        | +5% overall  | Actionability 2→3
```

Then expand each row using the recommendation block format from Phase 3.

The dimension names above are illustrative — use the actual dimensions from your review output. They come from the active reviewer's judges (the default reviewer scores a `description` and a `content` judge); a custom reviewer can define different ones.

When a recommendation has a trade-off (e.g. conciseness gain vs. domain context loss), present both options and ask. Frame changes as proposals; get user approval before applying.

### Phase 6: Apply Changes

Use the Edit tool to update the SKILL.md and any reference docs the review flagged (e.g. a `references/*.md` link fix, or moving inlined content out of SKILL.md for progressive disclosure). Keep edits minimal and conservative. For issues in non-prose bundle files (scripts/, assets/), surface them for the user rather than rewriting them here. Track applied recommendations and expected impacts.

### Phase 7: Verify Improvement

**Run review again:**

```bash
tessl review run <path-to-skill> --label "verify"
```

**Compare scores:**

```
Before: 72% | After: 89% (+17%)
- Completeness: 2/3 → 3/3 (added "Use when..." clause)
- Actionability: 2/3 → 3/3 (added executable code)
- Conciseness: 1/3 → 2/3 (removed verbose explanations)
```

Explain which dimensions improved and their impact on the overall score.

### Phase 8: Final Accuracy Check

Re-run validation from Phase 4 on the updated SKILL.md:
- ✓ Code syntax valid
- ✓ Command flags correct
- ✓ File references exist
- ✓ Description has "Use when..." clause
- ✓ No concepts Claude already knows

Fix any issues, then re-run `tessl review run` to confirm improvement.

## Fast path: automated fix loop

When the user wants hands-off iteration rather than the approval-gated workflow above, use `tessl review fix`. It runs the review-and-fix loop automatically — improving the skill and re-reviewing up to `--max-iterations` (default 3, max 10), stopping early once it hits `--threshold`:

```bash
tessl review fix <path-to-skill> --max-iterations 3 --threshold 85
```

It downloads the improved bundle, prints the **baseline → final score**, and asks for confirmation before applying (pass `--yes` to auto-apply). Note `tessl review fix` has **no `--label`** flag.

Choose between the two paths:
- **Manual workflow (Phases 1–8):** when you want syntax/command validation, trade-off discussion, and approval-gated control over each change.
- **`tessl review fix`:** when you want speed and are comfortable with the reviewer applying changes automatically.

## Customizing the reviewer

Both `tessl review run` and `tessl review fix` use the **default reviewer** unless you pass `--review-plugin <local-dir | workspace/plugin[@version]>`. Most users keep the default. To author a custom reviewer that adds or removes judges and scoring dimensions, use the **`create-review-plugin`** skill (`tessl/review-plugin-creator`).

## Progressive Disclosure

**Every link must signal WHEN it's relevant:**
- ✅ "See [AUTH.md] for OAuth flow setup, token refresh, and session management"
- ❌ "See [GUIDE.md] for more details"

**Check for orphaned files:**

Files in the bundle that are never referenced add bloat without providing value.

```bash
# Find files that exist but aren't linked
ls skill_dir/ | grep -v SKILL.md
grep -oE '\[[^]]*\]\(([^)]+\.md)\)' SKILL.md | cut -d'(' -f2 | cut -d')' -f1
# Compare: files that exist but aren't in the grep output = orphaned
```

**For each orphaned file, recommend:**
- ✅ Link it with clear routing signals: "See [FILE.md] for X when Y"
- ❌ Remove it: "FILE.md exists but is never referenced—remove to reduce plugin bloat?"

Don't leave unreferenced files in the bundle. They waste space and confuse maintainers.

## Notes

- Modifies the SKILL.md and its reference docs; surfaces (but doesn't rewrite) issues in scripts/assets
- Uses `tessl review run` for evaluation, or `tessl review fix` for the automated loop
- Validates syntax/commands before applying
- For bulk/PR work on external repos, iterate this workflow per skill or automate with a script
