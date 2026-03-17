# Tech Stack

## Runtime & Language
- **Runtime**: Node.js 22.x + Bun 1.3.10
- **Language**: TypeScript 5.9.3

## Monorepo
- **Build System**: Turborepo 2.8.x
- **Package Manager**: Bun with workspaces (`packages/`, `apps/`, `plugins/`)

## Web Application (`apps/web/`)
- **Framework**: Nuxt 4 (Vue 3)
- **UI**: Nuxt UI v4
- **Content**: Nuxt Content (markdown pages)
- **Database**: better-sqlite3

## Testing
- **Unit/Integration**: Vitest 4.x

## Code Quality
- **Linting**: ESLint 10 with @antfu/eslint-config
- **Formatting**: Prettier
- **Commits**: commitlint (conventional commits) + Husky

## Plugin Infrastructure
- **External Plugins**: Git submodules in `external-plugins/`
- **MCP Servers**: @modelcontextprotocol/sdk (Node.js)
- **Sync Tooling**: `bun scripts/cli.ts` (init, sync, check, cleanup)

## Development Commands
- `bun install` — Install dependencies
- `bun run dev` — Start development server (Turborepo)
- `bun run test` — Run all tests (Turborepo)
- `bun run lint` — Run linting (Turborepo)
- `bun run lint:fix` — Auto-fix lint issues
- `bun run build` — Build all packages
- `bun run skills:sync` — Sync plugin artifacts from upstream sources
- `bun run skills:check` — Validate plugin sync status
