---
name: use-tanstack
description: 'Answer questions and write code for TanStack libraries using version-accurate, officially shipped Agent Skills instead of training data. Use when working with any @tanstack/* package or TanStack library: Query (react-query, solid-query, vue-query — useQuery, useMutation, QueryClient, queryOptions, invalidation, optimistic updates), Router (@tanstack/react-router — createFileRoute, loaders, search params, path params, type-safe navigation), Start (full-stack framework — server functions, SSR, streaming), Table (headless tables — useReactTable, columns, sorting, filtering, pagination), Form (useForm, field validation), DB (createCollection, live queries, optimistic mutations, sync adapters), Virtual (useVirtualizer, list/grid virtualization), Store, Pacer (debounce/throttle/queue), AI, Devtools, Config, or CLI. Also use when the user mentions tanstack.com docs or the @tanstack/intent CLI.'
---

## Core Principle: Load Official Skills, Do Not Trust Internal Knowledge

TanStack libraries release fast and their APIs drift between minor versions. TanStack ships **official Agent Skills inside the npm packages themselves**, versioned with each release. The [`@tanstack/intent`](https://tanstack.com/intent) CLI discovers and loads the skills matching the **exact versions installed in the project** — always prefer them over recalled knowledge.

Pick the runner matching the project's package manager:

| Tool | Pattern |
|------|---------|
| npm  | `npx @tanstack/intent@latest <command>` |
| pnpm | `pnpm dlx @tanstack/intent@latest <command>` |
| Yarn | `yarn dlx @tanstack/intent@latest <command>` |
| Bun  | `bunx @tanstack/intent@latest <command>` |

## Workflow

**1. Discover** — from the project root (must run after dependencies are installed):

```bash
npx @tanstack/intent@latest list
```

This scans `node_modules` / workspace dependencies for intent-enabled packages and prints every available skill with its description and the exact `load` command, e.g.:

```
@tanstack/db
  db-core                 [core]        TanStack DB core concepts: createCollection ...
    Load: npx @tanstack/intent@latest load @tanstack/db#db-core
    live-queries          [sub-skill]   Query builder fluent API: from, where, join ...
    mutations-optimistic  [sub-skill]   collection.insert, collection.update ...
```

**2. Load** — start with the `[core]` skill for the library, then load only the sub-skills whose descriptions match the task:

```bash
npx @tanstack/intent@latest load @tanstack/db#db-core
npx @tanstack/intent@latest load @tanstack/db#db-core/live-queries
```

The output is the SKILL.md content for the installed package version. Treat it as authoritative: verify every API name and signature against it before writing code, and prefer it over any conflicting memory of the API.

**3. Re-check on version changes** — skills are pinned to the installed version. If dependencies are updated mid-session, re-run `list`/`load`.

Notes:

- `list` only scans local project dependencies by default; pass `--global` to include globally installed packages.
- `load --path` prints the resolved skill file path instead of its content (useful for debugging).
- The CLI may print a notice about `package.json#intent.skills` — that allowlist narrows which packages' skills are surfaced. Do not add one unless the user asks.

## Fallback: Packages Without Shipped Skills

Intent is rolling out across the ecosystem (newest packages first — Router, Start, DB, AI, Devtools ship skills; some stable packages like `@tanstack/react-query` may not yet). If `list` shows no skills for the library you need, check the installed version first (`npm ls @tanstack/react-query` or read the lockfile), then:

1. **Preferred — [`ask`](https://github.com/pleaseai/ask) CLI** (check `which ask`). It fetches the library's docs/source at the exact installed version (resolved from the lockfile) and caches them locally for grepping:

   ```bash
   # `ask docs` prints candidate paths one per line (installed package dir, then
   # the repo docs tree). Pick the last line that is an existing directory rather
   # than blindly trusting `tail -n1` — output format/notices can shift.
   ASK_DOCS=$(ask docs "npm:@tanstack/react-query" | while read -r p || [ -n "$p" ]; do [ -d "$p" ] && echo "$p"; done | tail -n1)
   [ -d "$ASK_DOCS" ] && rg -l "useQuery" "$ASK_DOCS"
   ASK_SRC=$(ask src "npm:@tanstack/react-query" | while read -r p || [ -n "$p" ]; do [ -d "$p" ] && echo "$p"; done | tail -n1)   # implementation, for API signatures
   ```

   Append `@<version>` to pin explicitly (e.g. `npm:@tanstack/react-query@5.101.2`). Requires `ask` >= 0.4.9 — older versions cannot resolve TanStack's scoped monorepo release tags; there, fall back to `github:TanStack/query@main` (repo names match the library: `TanStack/query`, `TanStack/router`, `TanStack/table`, `TanStack/form`, `TanStack/virtual`, ...) and cross-check anything version-sensitive against the installed package's `node_modules` typings or CHANGELOG.

2. **No `ask` — official markdown docs.** Every page on tanstack.com has a plain-markdown variant; append `.md` to the docs URL:

   ```bash
   curl -fsSL https://tanstack.com/query/latest/docs/framework/react/overview.md
   curl -fsSL https://tanstack.com/table/latest/docs/introduction.md
   ```

   Replace `latest` with the installed major version (e.g. `/query/v5/`) when the project is not on the latest line.

If neither shipped skills nor version-matching docs can back an answer, say so explicitly instead of guessing.

## Common Decision Points

- **Which library?** Query = server-state caching/fetching; DB = client-side reactive collections with optimistic mutations and sync; Store = tiny framework-agnostic reactive store. Do not reach for DB when plain Query suffices.
- **Router vs Start**: Router is the type-safe routing library; Start is the full-stack framework built on it (server functions, SSR). A Router project is not automatically a Start project — check for `@tanstack/react-start` before suggesting server functions.
- **Framework adapters**: most libraries are headless cores with per-framework adapters (`@tanstack/react-*`, `@tanstack/vue-*`, `@tanstack/solid-*`, ...). Load skills / read docs for the adapter actually installed, not the React one by default.
