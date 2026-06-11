# Bun Package Manager

Drop-in replacement for `npm`/`yarn`/`pnpm`. Reads `package.json`, writes `bun.lock` (text JSONC; the default lockfile format since Bun 1.2.0).

## CLI essentials

```bash
bun install                     # install all deps; alias: bun i
bun add react                   # add to dependencies
bun add -d @types/bun           # devDependencies; aliases: --development, --save-dev
bun add -o sharp                # optionalDependencies
bun add -p react                # peerDependencies (also installed by default)
bun add react@19.1.1            # exact
bun add react@latest            # tag
bun add github:vercel/next.js   # git
bun add ./local-pkg             # tarball or local path

bun remove react                # alias: bun rm
bun update                      # update within ranges; rewrites lockfile
bun outdated                    # show outdated packages
bun audit                       # security advisories (1.2+)

bun pm ls                       # list installed
bun pm trust <pkg>              # allow lifecycle scripts (postinstall, etc.)
bun pm untrusted                # list pkgs blocked from running lifecycle scripts
bun pm cache                    # show cache dir
bun pm cache rm                 # purge cache
bun pm migrate                  # migrate from npm/yarn/pnpm lockfile
bun pm pack                     # create publishable tarball (resolves workspace:*/catalog:)
bun publish                     # publish to registry
```

## Lifecycle scripts — security by default

Unlike npm, **Bun does not execute postinstall/preinstall/prepublish scripts of installed dependencies** by default. Allowlist what you trust:

```json package.json
{
  "trustedDependencies": ["sharp", "esbuild", "puppeteer"]
}
```

Your *own* project's scripts (`scripts.preinstall`, etc.) always run. The block applies only to third-party dependencies.

## Workspaces (monorepo)

```json package.json (root)
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": ["packages/*", "apps/*", "!packages/**/template/**"],
  "devDependencies": {
    "shared-utils": "workspace:*"
  }
}
```

Glob syntax (including negation) is supported. Inside a workspace package reference others by:

```json
{ "dependencies": { "pkg-b": "workspace:*" } }
```

On publish, `bun pm pack` and `bun publish` rewrite `workspace:*` to the current version. Filter operations:

```bash
bun install --filter "pkg-*" --filter "!pkg-c"
bun run --filter "./apps/web" dev
bun run --filter "*" build
```

## Catalogs (Bun 1.2+)

Share dependency versions across a monorepo from one place:

```json package.json (root)
{
  "workspaces": {
    "packages": ["packages/*"],
    "catalog": {
      "react": "^19.0.0",
      "react-dom": "^19.0.0"
    },
    "catalogs": {
      "testing": {
        "jest": "30.0.0"
      }
    }
  }
}
```

```json packages/app/package.json
{
  "dependencies": {
    "react": "catalog:",                  // default catalog
    "react-dom": "catalog:",
    "jest": "catalog:testing"             // named catalog
  }
}
```

`bun pm pack` / `bun publish` resolves `catalog:` to the concrete version.

## Overrides

Force a specific version of a transitive dependency:

```json
{
  "overrides": {
    "lodash": "4.17.21",
    "react": "$react"                     // alias the value of root react
  }
}
```

`overrides` is the standard npm-compatible spelling. Bun also recognises `resolutions` (Yarn-style) for compatibility.

## Isolated installs (Bun 1.2+)

Strict, pnpm-style symlinked `node_modules` that prevents phantom dependencies:

```toml bunfig.toml
[install]
linker = "isolated"
```

Default is `hoisted` (npm-style). Switch to `isolated` for strict resolution; expect to declare every dependency you import.

## Registries & scopes

```toml bunfig.toml
[install.registry]
default = "https://npm.example.com/"

[install.scopes]
"@my-org" = { url = "https://npm.pkg.github.com/", token = "$GITHUB_TOKEN" }
```

Or via `.npmrc` (Bun reads it for compatibility):

```
@my-org:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Tokens can reference env vars with `$VAR`.

## bunfig.toml — install keys

```toml
[install]
optional = true          # install optionalDependencies
dev = true               # install devDependencies
peer = true              # install peerDependencies (Bun does this by default)
production = false       # set true in CI / Docker to skip dev deps
exact = false            # write exact versions (no ^ or ~) on bun add
saveTextLockfile = true  # default since 1.2.0
linker = "hoisted"       # or "isolated"
frozenLockfile = false   # true in CI

[install.cache]
dir = "~/.bun/install/cache"
disable = false
disableManifest = false
```

## CI patterns

```bash
# Lock the lockfile in CI — fail if it would change
bun install --frozen-lockfile

# Production install (skip devDeps)
bun install --production

# Reuse cache between jobs
# GitHub Actions:
#   uses: oven-sh/setup-bun@v2
#   with: { bun-version: latest }
# cache key: hash of bun.lock; cache path: ~/.bun/install/cache
```

## Migrating

| From | Command |
|------|---------|
| `package-lock.json` (npm) | `bun install` — auto-imports |
| `yarn.lock` (Yarn) | `bun install` — auto-imports |
| `pnpm-lock.yaml` (pnpm) | `bun pm migrate` then `bun install` |

After migration, commit `bun.lock` and **remove the old lockfile** to avoid drift.

## Common gotchas

- **Lockfile diffs in PR**: `bun.lock` is text JSONC, reviewable in diffs. The old `bun.lockb` is binary — if you still see it, run `bun install` once to regenerate as text, then delete `bun.lockb`.
- **`workspace:` not on disk**: `workspace:` paths are resolved by Bun, not by `node_modules` symlinks (default linker is hoisted). If you need a symlinked tree, set `linker = "isolated"`.
- **Lifecycle scripts silently skipped**: a freshly cloned project may have native modules (e.g. `sharp`, `better-sqlite3`) that look broken because their postinstall didn't run. Check `bun pm untrusted` and add to `trustedDependencies`.
- **`catalog:` resolution at publish**: `bun publish` / `bun pm pack` rewrite the protocol; consumers see the concrete version. Do not write `catalog:` references manually outside a monorepo root.
