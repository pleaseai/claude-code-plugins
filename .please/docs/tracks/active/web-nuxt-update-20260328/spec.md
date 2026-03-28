# Web App Dependency Update

> Track: web-nuxt-update-20260328

## Overview

Update all outdated dependencies in `apps/web/` to their latest versions, including Nuxt core ecosystem, Vue, dev tooling, and major version bumps.

## Scope

### Core Framework
| Package | Current | Target |
|---------|---------|--------|
| nuxt | 4.1.3 | 4.4.2 |
| @nuxt/ui | 4.0.1 | 4.6.0 |
| @nuxt/content | 3.7.1 | 3.12.0 |

### Vue Ecosystem
| Package | Current | Target |
|---------|---------|--------|
| vue | 3.5.22 | 3.5.31 |
| vue-router | 5.0.3 | 5.0.4 |

### Dev Tools
| Package | Current | Target |
|---------|---------|--------|
| eslint | 10.0.2 | 10.1.0 |
| better-sqlite3 | 12.4.1 | 12.8.0 |

### Major Bumps (Breaking Changes Possible)
| Package | Current | Target |
|---------|---------|--------|
| @nuxt/test-utils | 3.19.2 | 4.0.0 |
| typescript | 5.9.3 | 6.0.2 |

## Success Criteria

- [ ] SC-1: All listed packages updated to target versions
- [ ] SC-2: `bun run build` succeeds without errors
- [ ] SC-3: `bun run dev` starts and serves pages correctly
- [ ] SC-4: No TypeScript compilation errors
- [ ] SC-5: Breaking changes from major bumps are addressed (API migrations, config changes)

## Constraints

- Maintain backward compatibility with existing page routes and ISR configuration
- Preserve Nuxt UI component usage patterns (migrate if API changed in v4.6.0)
- Keep `compatibilityDate` in `nuxt.config.ts` aligned with updated Nuxt version

## Out of Scope

- Adding new features or pages
- Refactoring existing components beyond what's required by breaking changes
- Updating root-level monorepo dependencies outside `apps/web/`
