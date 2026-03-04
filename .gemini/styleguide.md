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

### Review Checklist

When reviewing pull requests:

- [ ] Check if changed files are under `plugins/*/skills/*/` paths
- [ ] If `SYNC.md` exists in the same directory, **reject the change** and redirect to the upstream vendor
- [ ] Do not request improvements or style fixes on vendor-synced files