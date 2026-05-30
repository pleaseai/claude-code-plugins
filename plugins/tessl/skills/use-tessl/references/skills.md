# Authoring & Reviewing Tessl Skills

Source: <https://docs.tessl.io/create/creating-skills>.

A **skill** is a procedural workflow that guides an agent through a complex task step-by-step. Skills are
the primary, generally-available plugin component. The `SKILL.md` format is shared across agent tools
(Claude Code, Codex, Antigravity, Cursor, Gemini, Windsurf) — only the surrounding manifest differs.

## `SKILL.md` format

YAML frontmatter followed by a Markdown body:

```markdown
---
name: my-skill            # lowercase, hyphens only — the skill identifier
description: >-           # the trigger: when the agent should activate this skill
  Clear description of when this skill applies, with concrete keywords and
  scenarios so the agent can discover it.
---

# My Skill

Step-by-step instructions for the agent...
```

- **`name`** — lowercase with hyphens, matches the skill directory name.
- **`description`** — the most important field: it is how agents *discover* the skill. Make it specific,
  list trigger keywords and scenarios, and describe when to use (and when not to use) it.

## Scaffolding

```bash
# Inside an existing plugin
tessl skill new --name my-skill --path ./my-plugin/skills/my-skill

# Standalone (creates .tessl-plugin/plugin.json + skills/my-skill/SKILL.md)
tessl skill new --name my-skill --description "What it does"
```

`tessl skill new` produces:

```
my-skill/
├── .tessl-plugin/plugin.json     # manifest with skills: ["skills/my-skill"]
└── skills/my-skill/SKILL.md
```

If you already have a hand-written `SKILL.md`, generate a manifest from it:

```bash
tessl skill import --workspace myworkspace            # build .tessl-plugin/plugin.json from SKILL.md
tessl skill import --workspace myworkspace --public   # make it publicly visible
```

## Validating & reviewing

```bash
tessl skill lint ./skills/my-skill                 # structural validation against the skill spec
tessl skill review                                 # AI quality + compliance review (scored)
tessl skill review --optimize --max-iterations 3   # auto-apply improvements over N iterations
```

Run `tessl skill review` before publishing — it scores quality and surfaces compliance gaps. The same
review runs in CI via [`tesslio/skill-review`](https://github.com/tesslio/skill-review), which comments
scores on PRs and can fail the check below a `fail-threshold` (see [`ci-publishing.md`](ci-publishing.md)).

## Publishing a single skill

```bash
tessl skill publish --workspace myworkspace --bump patch
```

This imports the skill into a `.tessl-plugin/plugin.json` (if needed) and publishes it to the registry in
one step. For multiple related skills, prefer bundling them in a plugin and using `tessl plugin publish`
(see [`plugins.md`](plugins.md)).

## Rules

Rules are mandatory, always-loaded coding standards — error handling, validation, response formats,
security practices, naming conventions. They live in a plugin's `rules/` directory as Markdown and apply
to all agent code generation, unlike skills which the agent loads on demand. Test a rule by asking the
agent to generate code and confirming it follows the standard.

## Writing high-signal skills

- Front-load the trigger in `description` — keywords, file patterns, and scenarios drive discovery.
- Keep the body procedural and imperative: numbered steps, decision points, exact commands.
- Verify any tool/CLI invocations the skill recommends against the live `--help` output.
- Split deep material into reference files the skill links to, so the entry point stays lean.
