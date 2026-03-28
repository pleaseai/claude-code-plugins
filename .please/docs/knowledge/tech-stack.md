# Tech Stack

## Runtime & Package Manager

- **Node.js** 22.x
- **Bun** 1.3.10+ (package manager & script runner)

## Languages

- **TypeScript** 6.x (strict mode)

## Build & Monorepo

- **Turborepo** (task orchestration, caching)
- **Bun workspaces** (`packages/*`, `apps/*`, `plugins/*`)

## Web Application (apps/web/)

- **Nuxt 4** (Vue 3 SSR framework)
- **Vue** 3.5.x + **Vue Router** 5.x
- **Nuxt UI** v4 (component library)
- **Nuxt Content** (markdown content management)
- **better-sqlite3** (local database)

## Testing

- **Vitest** 4.x (unit/integration tests)

## Code Quality

- **ESLint** with `@antfu/eslint-config`
- **Prettier** (formatting)
- **commitlint** + **Husky** (conventional commits)

## Plugin Infrastructure

- **MCP SDK** (`@modelcontextprotocol/sdk`) for plugin servers
- **Git submodules** for external plugin management
- **Custom CLI** (`scripts/cli.ts`) for plugin sync/init workflows
