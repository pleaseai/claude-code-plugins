# Product Guidelines

## Code Style & Conventions

- **Language**: TypeScript throughout (strict mode)
- **Package manager**: Bun (v1.3.10+)
- **Build system**: Turborepo for monorepo orchestration
- **Linting**: ESLint with @antfu/eslint-config
- **Formatting**: Prettier
- **Commits**: Conventional Commits enforced via commitlint + Husky
- **Node version**: 22.x

## Plugin Standards

- Every plugin must have a `.claude-plugin/plugin.json` manifest
- External plugins are maintained as git submodules in `external-plugins/`
- Built-in plugins live in `plugins/` and are part of the monorepo workspace
- Skills are preferred over SessionStart hooks for token efficiency
- Vendor-synced files (with `SYNC.md` marker) must not be manually edited

## Documentation

- English for all code artifacts: commit messages, PR titles/descriptions, comments
- Each plugin should include a README with installation instructions
- CLAUDE.md serves as the primary AI context document

## Quality Gates

- All PRs require passing CI (lint, typecheck, tests)
- Plugin manifests must pass `claude plugin validate`
- Conventional commit format enforced by pre-commit hook

## Web Marketplace

- Built with Nuxt 4, Vue 3, Nuxt UI v4
- Content managed via Nuxt Content
- Static generation for production deployment
