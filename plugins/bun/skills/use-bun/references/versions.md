# Bun Version Pinning with `ask`

Bun lives at `github:oven-sh/bun`. There is **no separate `bun` npm package** for the runtime itself, so `ask` cannot resolve `npm:bun` from a lockfile — you must pin the GitHub ref explicitly.

## Resolve the installed version

```bash
# Order of authority (highest wins):
# 1. .bun-version          — explicit project pin
# 2. package.json "packageManager": "bun@X.Y.Z"
# 3. package.json "engines": { "bun": "..." }
# 4. global bun installed at $PATH (bun --version)

resolve_bun_version() {
  if [ -f .bun-version ]; then
    cat .bun-version
  elif jq -e '.packageManager | startswith("bun@")' package.json >/dev/null 2>&1; then
    jq -r '.packageManager | sub("^bun@"; "")' package.json
  else
    bun --version 2>/dev/null
  fi
}

BUN_VER="v$(resolve_bun_version)"   # e.g. v1.3.14
echo "Resolved: ${BUN_VER}"
```

## Fetch docs / source at that version

```bash
# One-shot reads — paths print to stdout, progress to stderr
ask docs "github:oven-sh/bun@${BUN_VER}"   # candidate doc dirs
ask src  "github:oven-sh/bun@${BUN_VER}"   # checkout root

# Common idiom
BUN_SRC=$(ask src "github:oven-sh/bun@${BUN_VER}")
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
| < 1.1.21 | `bun.lockb` (binary) | Not human-readable; diffs unreadable in PR review |
| ≥ 1.1.21 | `bun.lock` (text JSONC) | Default. Migrates on first `bun install` |

If both files exist, Bun reads `bun.lock` and ignores `bun.lockb`. Remove the binary copy when migrating.

## Stable release tags (for `ask` pinning)

Bun follows `vMAJOR.MINOR.PATCH`. Latest tags as of writing:

- `v1.3.14` — last 1.3.x patch release  
- `v1.3.0` — minor (Sept 2025)
- `v1.2.0` — minor; catalogs + isolated installs
- `v1.1.21` — switch to text `bun.lock`
- `v1.1.0` — bundler `--compile` stabilisation, fullstack dev server
- `v1.0.0` — first stable

Always verify by checking the local install: `bun --version` is the truth for the current machine. `main` may contain unreleased APIs that won't work for users on a tagged release.

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
