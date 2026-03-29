/**
 * Workspace resolution for monorepo projects.
 *
 * Resolves workspace package directories from npm/yarn/Bun workspaces
 * and pnpm-workspace.yaml, then aggregates dependencies across all packages.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

export interface AggregatedDeps {
  /** Merged dependencies from root + all workspace packages */
  deps: Record<string, string>
  /** Maps package name → relative workspace path (only for workspace-origin deps) */
  sources: Record<string, string>
}

/**
 * Resolve glob patterns to directories containing package.json files.
 * Handles simple glob patterns like "apps/*", "packages/*" without external deps.
 */
function resolveGlobPatterns(cwd: string, patterns: string[]): string[] {
  const dirs: string[] = []

  for (const pattern of patterns) {
    if (pattern.startsWith('!')) continue

    const base = pattern.includes('*')
      ? pattern.split('*')[0].replace(/[/\\]$/, '')
      : null

    // Exact directory path (no glob)
    if (!pattern.includes('*')) {
      const fullPath = join(cwd, pattern)
      try {
        if (existsSync(fullPath) && statSync(fullPath).isDirectory() && existsSync(join(fullPath, 'package.json'))) {
          dirs.push(fullPath)
        }
      }
      catch { /* skip inaccessible */ }
      continue
    }

    // Glob pattern: list entries of the base directory
    if (!base) continue
    const basePath = join(cwd, base)
    try {
      if (!existsSync(basePath)) continue
      const entries = readdirSync(basePath)
      for (const entry of entries) {
        const fullPath = join(basePath, entry)
        try {
          if (statSync(fullPath).isDirectory() && existsSync(join(fullPath, 'package.json'))) {
            dirs.push(fullPath)
          }
        }
        catch { /* skip inaccessible entries */ }
      }
    }
    catch { /* skip inaccessible base */ }
  }

  return dirs
}

/**
 * Resolve workspace package directories from root package.json and/or pnpm-workspace.yaml.
 * Returns absolute paths to workspace directories that contain a package.json.
 */
export function resolveWorkspacePackages(
  cwd: string,
  rootPkg: Record<string, unknown> | null,
): string[] {
  const patterns: string[] = []

  // npm/yarn/Bun: read "workspaces" field from root package.json
  if (rootPkg) {
    const workspaces = rootPkg.workspaces
    if (Array.isArray(workspaces)) {
      patterns.push(...workspaces.filter((w): w is string => typeof w === 'string'))
    }
    // yarn also supports { packages: [...] } form
    else if (workspaces && typeof workspaces === 'object' && 'packages' in workspaces) {
      const pkgs = (workspaces as Record<string, unknown>).packages
      if (Array.isArray(pkgs)) {
        patterns.push(...pkgs.filter((w): w is string => typeof w === 'string'))
      }
    }
  }

  // pnpm: read pnpm-workspace.yaml
  const pnpmWorkspacePath = join(cwd, 'pnpm-workspace.yaml')
  try {
    if (existsSync(pnpmWorkspacePath)) {
      const content = readFileSync(pnpmWorkspacePath, 'utf-8')
      const lines = content.split('\n')
      let inPackages = false
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed === 'packages:') {
          inPackages = true
          continue
        }
        if (inPackages) {
          if (trimmed.startsWith('- ')) {
            const value = trimmed.slice(2).trim().replace(/^['"]|['"]$/g, '')
            if (value && !patterns.includes(value)) {
              patterns.push(value)
            }
          }
          else if (trimmed && !trimmed.startsWith('#')) {
            break
          }
        }
      }
    }
  }
  catch { /* skip malformed pnpm-workspace.yaml */ }

  if (patterns.length === 0) return []

  return resolveGlobPatterns(cwd, patterns)
}

/**
 * Collect and merge dependencies from root package.json and all workspace packages.
 * Returns merged deps and a source map for workspace-origin deps.
 */
export function collectAllDependencies(
  cwd: string,
  loadPackageJson: (dir: string) => Record<string, unknown> | null,
): AggregatedDeps {
  const rootPkg = loadPackageJson(cwd)
  const deps: Record<string, string> = {}
  const sources: Record<string, string> = {}

  // Add root deps first
  if (rootPkg) {
    Object.assign(deps, rootPkg.dependencies as Record<string, string> | undefined)
    Object.assign(deps, rootPkg.devDependencies as Record<string, string> | undefined)
  }

  // Add workspace deps, tracking sources for non-root packages
  const workspaceDirs = resolveWorkspacePackages(cwd, rootPkg)
  for (const dir of workspaceDirs) {
    const pkg = loadPackageJson(dir)
    if (!pkg) continue

    const relPath = relative(cwd, dir)
    const wsDeps = {
      ...(pkg.dependencies as Record<string, string> | undefined),
      ...(pkg.devDependencies as Record<string, string> | undefined),
    }

    for (const [name, version] of Object.entries(wsDeps)) {
      if (!(name in deps)) {
        deps[name] = version
        sources[name] = relPath
      }
    }
  }

  return { deps, sources }
}
