# Style Guide

## Vendor-Synced Skills (Read-Only)

Skills in `plugins/*/skills/` that contain a `SYNC.md` file are vendor-synced and **must not be modified directly** — changes will be overwritten on the next sync.

```bash
# Check before editing
cat plugins/<plugin>/skills/<skill>/SYNC.md
```

### Rules

- **Do not modify** any skill file that contains a `SYNC.md` sibling file.
- **Do not suggest edits** to vendor-synced skill files in code reviews.
- **Skip review comments** targeting files under paths that contain a `SYNC.md`.
- If a vendor-synced file needs a fix, update the upstream vendor source instead.

### Identifying Vendor-Synced Files

A skill directory is vendor-synced if it contains a `SYNC.md` file:

```
plugins/<plugin>/skills/<skill>/
├── SKILL.md      ← vendor-synced, do not modify
└── SYNC.md       ← presence of this file marks it as vendor-synced
```

## Skills.sh Installed Skills (Read-Only)

Skills installed via `bunx skills add` live under `plugins/*/.agents/skills/` and are managed by `skills-lock.json`. These files **must not be modified directly**.

### Rules

- **Do not modify** any file under `plugins/*/.agents/skills/` paths.
- **Do not suggest edits** to these files in code reviews.
- **Skip review comments** targeting files under `.agents/skills/` paths.
- If a skills.sh-installed file needs a fix, update the upstream skill repository instead.

### Identifying Skills.sh-Installed Files

A plugin using skills.sh will have this structure:

```
plugins/<plugin>/
├── .agents/skills/        ← all files here are read-only
│   └── <skill-name>/
│       └── SKILL.md
└── skills-lock.json       ← presence of this file marks skills as externally managed
```

### Review Checklist

When reviewing pull requests:

- [ ] Check if changed files are under `plugins/*/skills/*/` paths
- [ ] If `SYNC.md` exists in the same directory, **reject the change** and redirect to the upstream vendor
- [ ] Check if changed files are under `plugins/*/.agents/skills/` paths
- [ ] If `skills-lock.json` exists in the plugin root, **reject the change** and redirect to the upstream skill repository
- [ ] Do not request improvements or style fixes on vendor-synced or skills.sh-installed files