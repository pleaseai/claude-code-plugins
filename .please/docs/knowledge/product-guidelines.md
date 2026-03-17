# Product Guidelines

## Code Style & Conventions
- **Language**: TypeScript throughout (strict mode)
- **Package Manager**: Bun (v1.3.10+)
- **Monorepo**: Turborepo with workspaces (`packages/`, `apps/`, `plugins/`)
- **Linting**: ESLint with @antfu/eslint-config + Prettier
- **Commits**: Conventional Commits enforced via commitlint + Husky
- **Testing**: Vitest for unit/integration tests
- **Node**: v22.x required

## Plugin Standards
- Every plugin must have a valid `.claude-plugin/plugin.json` manifest
- Plugin names use kebab-case
- MCP servers use `npx -y` for npm-published packages
- Skills are preferred over SessionStart hooks for token efficiency
- Vendor-synced files (marked with `SYNC.md`) must not be manually edited

## Documentation
- Plugin READMEs include Claude Code installation instructions
- Environment variables use `${VAR:-}` pattern for optional values
- Context files specify clear trigger patterns in skill descriptions

## Quality Gates
- All PRs must pass `turbo test` and `turbo lint`
- Plugin manifests validated via `claude plugin validate`
- Commit messages follow conventional commit format
