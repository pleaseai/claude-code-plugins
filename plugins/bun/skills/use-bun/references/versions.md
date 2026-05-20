# Bun Version Pinning with `ask`

Bun lives at `github:oven-sh/bun`. There is **no separate `bun` npm package** for the runtime itself, so `ask` cannot resolve `npm:bun` from a lockfile — you must pin the GitHub ref explicitly.

## Resolve the installed version

Use the bundled helper script. It walks the standard sources in priority order:

1. `.bun-version` — explicit project pin
2. `package.json` `"packageManager": "bun@X.Y.Z"` — corepack-style pin
3. `package.json` `"engines": { "bun": "..." }` — engine constraint
4. Global `bun` on `$PATH` — runtime fallback

The script returns a bare version like `1.3.14`. **`ask` / GitHub need the full tag form `bun-vX.Y.Z`** (not `vX.Y.Z` — that tag does not exist):

```bash
BUN_REF="bun-v$(${CLAUDE_SKILL_DIR}/scripts/resolve-bun-version.sh)" || exit 1
echo "Resolved: ${BUN_REF}"   # e.g. bun-v1.3.14
ask src "github:oven-sh/bun@${BUN_REF}"
```

The script exits non-zero with a message on stderr if no version source is available; chain with `|| exit 1` when the next step requires a version.

If you want to inspect the resolution logic, read `${CLAUDE_SKILL_DIR}/scripts/resolve-bun-version.sh` directly — it is ~30 lines of bash.

## Fetch docs / source at that version

```bash
# One-shot reads — paths print to stdout, progress to stderr
ask docs "github:oven-sh/bun@${BUN_REF}"   # candidate doc dirs
ask src  "github:oven-sh/bun@${BUN_REF}"   # checkout root

# Common idiom
BUN_SRC=$(ask src "github:oven-sh/bun@${BUN_REF}")
rg "Bun\.serve" "${BUN_SRC}/docs"
cat "${BUN_SRC}/docs/runtime/http/server.mdx"
```

If you only need the upstream view of the API and version doesn't matter:

```bash
ask src  github:oven-sh/bun@main
ask docs github:oven-sh/bun@main
```

## Lockfile format history

| Version | Lockfile | Notes |
|---------|----------|-------|
| < 1.2.0 | `bun.lockb` (binary) | Default before 1.2; not human-readable, diffs unreadable in PR review |
| ≥ 1.2.0 | `bun.lock` (text JSONC) | New default. Existing `bun.lockb` migrates via `bun install --save-text-lockfile --frozen-lockfile --lockfile-only` |

If both files exist, Bun reads `bun.lock` and ignores `bun.lockb`. Remove the binary copy when migrating.

## Release tag format

GitHub release tags for Bun are **`bun-vMAJOR.MINOR.PATCH`** (e.g. `bun-v1.3.14`). Plain `vX.Y.Z` tags do **not** exist — `ask` / curl against `v1.3.14` returns HTTP 404.

Verify against the live release list before pinning to an old version:

```bash
gh release list --repo oven-sh/bun --limit 30
gh release view bun-v1.3.14 --repo oven-sh/bun        # release notes
```

Landmark minor releases (verified via `gh release view`):

| Tag | Published | Notable changes |
|-----|-----------|----------------|
| `bun-v1.3.0` | 2025-10-10 | 1.3 minor — see release notes |
| `bun-v1.2.0` | 2025-01-22 | 1.2 minor — catalogs, isolated installs, text `bun.lock` becomes the default lockfile |
| `bun-v1.1.21` | 2024-07-27 | 1.1.x patch (text-lockfile work landed in the 1.1.x series; the default switch came at 1.2) |
| `bun-v1.1.0` | 2024-04-01 | 1.1 minor |
| `bun-v1.0.0` | 2023-09-08 | First stable release |

Always verify by checking the local install — `bun --version` is the truth for the current machine. `main` may contain unreleased APIs that won't work for users on a tagged release. Do **not** trust the bullet-point summaries above as authoritative changelog entries — they are landmarks, not full notes. Run `gh release view bun-v<X.Y.Z> --repo oven-sh/bun` for the real release notes.

## Documentation entry points in the source tree

After `ask src`:

```
${BUN_SRC}/
├── docs/                  ← MDX docs (what bun.com/docs serves)
│   ├── index.mdx          ← Overview
│   ├── runtime/           ← Bun.* APIs and bun:* modules
│   ├── pm/                ← Package manager
│   ├── test/              ← Test runner
│   ├── bundler/           ← Bundler / Bun.build
│   ├── guides/            ← Task-oriented recipes
│   └── docs.json          ← Mintlify TOC
├── packages/bun-types/    ← Type definitions (the source of truth for API shapes)
└── src/                   ← Zig + JS implementation (for "how does it actually work")
```

For API shape questions, prefer `packages/bun-types/` (`.d.ts`) over the docs — the docs explain intent, the types prove the signature.
