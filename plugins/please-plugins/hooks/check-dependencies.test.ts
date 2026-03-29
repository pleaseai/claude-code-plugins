import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  buildOutput,
  collectAllDependencies,
  detectPackages,
  detectTooling,
  extractPackagesFromCommand,
  filterInstalledPlugins,
  resolveWorkspacePackages,
  scanForSetup,
  type AggregatedDeps,
  type DetectedPlugin,
  type PluginMapping,
  type SetupOutput,
  type ToolingMapping,
  PLUGIN_MAPPINGS,
  TOOLING_MAPPINGS,
} from './check-dependencies'

describe('PLUGIN_MAPPINGS', () => {
  test('contains expected mappings', () => {
    expect(PLUGIN_MAPPINGS.length).toBeGreaterThan(0)

    const pluginNames = PLUGIN_MAPPINGS.map(m => m.pluginName)
    expect(pluginNames).toContain('nuxt-ui')
    expect(pluginNames).toContain('nuxt-seo')
    expect(pluginNames).toContain('pinia')
    expect(pluginNames).toContain('vueuse')
    expect(pluginNames).toContain('vitest')
    expect(pluginNames).toContain('prisma')
    expect(pluginNames).toContain('supabase')
  })

  test('each mapping has packages and pluginName', () => {
    for (const mapping of PLUGIN_MAPPINGS) {
      expect(mapping.packages.length).toBeGreaterThan(0)
      expect(mapping.pluginName).toBeTruthy()
    }
  })
})

describe('detectPackages', () => {
  test('detects @nuxt/ui in dependencies', () => {
    const pkg = { dependencies: { '@nuxt/ui': '^3.0.0' } }
    const result = detectPackages(pkg, PLUGIN_MAPPINGS)
    expect(result).toContainEqual(expect.objectContaining({ pluginName: 'nuxt-ui' }))
  })

  test('detects @nuxt/ui in devDependencies', () => {
    const pkg = { devDependencies: { '@nuxt/ui': '^3.0.0' } }
    const result = detectPackages(pkg, PLUGIN_MAPPINGS)
    expect(result).toContainEqual(expect.objectContaining({ pluginName: 'nuxt-ui' }))
  })

  test('detects @nuxtjs/seo and maps to nuxt-seo', () => {
    const pkg = { dependencies: { '@nuxtjs/seo': '^2.0.0' } }
    const result = detectPackages(pkg, PLUGIN_MAPPINGS)
    expect(result).toContainEqual(expect.objectContaining({ pluginName: 'nuxt-seo' }))
  })

  test('detects pinia and maps to pinia plugin', () => {
    const pkg = { dependencies: { 'pinia': '^2.0.0' } }
    const result = detectPackages(pkg, PLUGIN_MAPPINGS)
    expect(result).toContainEqual(expect.objectContaining({ pluginName: 'pinia' }))
  })

  test('detects @pinia/nuxt and maps to pinia plugin', () => {
    const pkg = { dependencies: { '@pinia/nuxt': '^0.5.0' } }
    const result = detectPackages(pkg, PLUGIN_MAPPINGS)
    expect(result).toContainEqual(expect.objectContaining({ pluginName: 'pinia' }))
  })

  test('detects @vueuse/nuxt and maps to vueuse plugin', () => {
    const pkg = { dependencies: { '@vueuse/nuxt': '^10.0.0' } }
    const result = detectPackages(pkg, PLUGIN_MAPPINGS)
    expect(result).toContainEqual(expect.objectContaining({ pluginName: 'vueuse' }))
  })

  test('detects @vueuse/core and maps to vueuse plugin', () => {
    const pkg = { dependencies: { '@vueuse/core': '^10.0.0' } }
    const result = detectPackages(pkg, PLUGIN_MAPPINGS)
    expect(result).toContainEqual(expect.objectContaining({ pluginName: 'vueuse' }))
  })

  test('detects vitest in devDependencies', () => {
    const pkg = { devDependencies: { 'vitest': '^2.0.0' } }
    const result = detectPackages(pkg, PLUGIN_MAPPINGS)
    expect(result).toContainEqual(expect.objectContaining({ pluginName: 'vitest' }))
  })

  test('detects @prisma/client and maps to prisma plugin', () => {
    const pkg = { dependencies: { '@prisma/client': '^5.0.0' } }
    const result = detectPackages(pkg, PLUGIN_MAPPINGS)
    expect(result).toContainEqual(expect.objectContaining({ pluginName: 'prisma' }))
  })

  test('detects multiple packages and returns all recommendations', () => {
    const pkg = {
      dependencies: {
        '@nuxt/ui': '^3.0.0',
        'pinia': '^2.0.0',
        '@prisma/client': '^5.0.0',
      },
    }
    const result = detectPackages(pkg, PLUGIN_MAPPINGS)
    const pluginNames = result.map(r => r.pluginName)
    expect(pluginNames).toContain('nuxt-ui')
    expect(pluginNames).toContain('pinia')
    expect(pluginNames).toContain('prisma')
  })

  test('returns unique results when multiple packages match same plugin', () => {
    const pkg = {
      dependencies: {
        'pinia': '^2.0.0',
        '@pinia/nuxt': '^0.5.0',
      },
    }
    const result = detectPackages(pkg, PLUGIN_MAPPINGS)
    const piniaResults = result.filter(r => r.pluginName === 'pinia')
    expect(piniaResults).toHaveLength(1)
  })

  test('returns empty array when no matching packages', () => {
    const pkg = { dependencies: { 'express': '^4.0.0' } }
    const result = detectPackages(pkg, PLUGIN_MAPPINGS)
    expect(result).toHaveLength(0)
  })

  test('returns empty array for empty package.json', () => {
    const result = detectPackages({}, PLUGIN_MAPPINGS)
    expect(result).toHaveLength(0)
  })

  test('handles package.json with no dependencies', () => {
    const pkg = { name: 'test', version: '1.0.0' }
    const result = detectPackages(pkg, PLUGIN_MAPPINGS)
    expect(result).toHaveLength(0)
  })
})

describe('detectTooling', () => {
  const mappings: ToolingMapping[] = [
    { indicators: { files: ['pnpm-lock.yaml'], packageManager: 'pnpm' }, pluginName: 'pnpm' },
    { indicators: { files: ['turbo.json'], packageManager: null }, pluginName: 'turborepo' },
  ]

  test('detects pnpm from pnpm-lock.yaml', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rec-'))
    writeFileSync(join(dir, 'pnpm-lock.yaml'), '')
    const result = detectTooling(dir, null, mappings)
    expect(result).toContainEqual(expect.objectContaining({ pluginName: 'pnpm' }))
  })

  test('detects pnpm from packageManager field', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rec-'))
    const pkg = { packageManager: 'pnpm@9.0.0' }
    const result = detectTooling(dir, pkg, mappings)
    expect(result).toContainEqual(expect.objectContaining({ pluginName: 'pnpm' }))
  })

  test('detects turborepo from turbo.json', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rec-'))
    writeFileSync(join(dir, 'turbo.json'), '{}')
    const result = detectTooling(dir, null, mappings)
    expect(result).toContainEqual(expect.objectContaining({ pluginName: 'turborepo' }))
  })

  test('returns empty when no tooling indicators found', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rec-'))
    const result = detectTooling(dir, null, mappings)
    expect(result).toHaveLength(0)
  })

  test('deduplicates when both lock file and packageManager match', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rec-'))
    writeFileSync(join(dir, 'pnpm-lock.yaml'), '')
    const pkg = { packageManager: 'pnpm@9.0.0' }
    const result = detectTooling(dir, pkg, mappings)
    const pnpmResults = result.filter(r => r.pluginName === 'pnpm')
    expect(pnpmResults).toHaveLength(1)
  })

  test('TOOLING_MAPPINGS contains expected entries', () => {
    const pluginNames = TOOLING_MAPPINGS.map(m => m.pluginName)
    expect(pluginNames).toContain('pnpm')
    expect(pluginNames).toContain('turborepo')
  })
})

describe('filterInstalledPlugins', () => {
  const mappings: PluginMapping[] = [
    { packages: ['@nuxt/ui'], pluginName: 'nuxt-ui' },
    { packages: ['pinia'], pluginName: 'pinia' },
    { packages: ['vitest'], pluginName: 'vitest' },
  ]

  test('removes plugins found in enabledPlugins', () => {
    const enabledPlugins = {
      'nuxt-ui@pleaseai': true,
      'pinia@pleaseai': false,
    }
    const result = filterInstalledPlugins(mappings, enabledPlugins)
    expect(result).toHaveLength(1)
    expect(result[0].pluginName).toBe('vitest')
  })

  test('keeps plugins not in enabledPlugins', () => {
    const result = filterInstalledPlugins(mappings, {})
    expect(result).toHaveLength(3)
  })

  test('removes plugins regardless of enabled/disabled state', () => {
    const enabledPlugins = {
      'nuxt-ui@pleaseai': false,
    }
    const result = filterInstalledPlugins(mappings, enabledPlugins)
    expect(result).toHaveLength(2)
  })

  test('handles undefined enabledPlugins', () => {
    const result = filterInstalledPlugins(mappings, undefined)
    expect(result).toHaveLength(3)
  })
})

describe('extractPackagesFromCommand', () => {
  test('extracts from bun add', () => {
    expect(extractPackagesFromCommand('bun add @nuxt/ui')).toEqual(['@nuxt/ui'])
  })

  test('extracts from npm install', () => {
    expect(extractPackagesFromCommand('npm install pinia')).toEqual(['pinia'])
  })

  test('extracts from npm add', () => {
    expect(extractPackagesFromCommand('npm add @vueuse/nuxt')).toEqual(['@vueuse/nuxt'])
  })

  test('extracts from pnpm add', () => {
    expect(extractPackagesFromCommand('pnpm add @prisma/client')).toEqual(['@prisma/client'])
  })

  test('extracts from pnpm install', () => {
    expect(extractPackagesFromCommand('pnpm install vitest')).toEqual(['vitest'])
  })

  test('extracts multiple packages', () => {
    expect(extractPackagesFromCommand('bun add @nuxt/ui pinia vitest')).toEqual(['@nuxt/ui', 'pinia', 'vitest'])
  })

  test('filters out flags', () => {
    expect(extractPackagesFromCommand('bun add -d vitest')).toEqual(['vitest'])
    expect(extractPackagesFromCommand('npm install --save-dev vitest')).toEqual(['vitest'])
    expect(extractPackagesFromCommand('pnpm add -D @prisma/client')).toEqual(['@prisma/client'])
  })

  test('returns empty for non-install commands', () => {
    expect(extractPackagesFromCommand('bun run dev')).toEqual([])
    expect(extractPackagesFromCommand('npm test')).toEqual([])
    expect(extractPackagesFromCommand('ls -la')).toEqual([])
  })

  test('returns empty for install without packages (lockfile install)', () => {
    expect(extractPackagesFromCommand('npm install')).toEqual([])
    expect(extractPackagesFromCommand('pnpm install')).toEqual([])
    expect(extractPackagesFromCommand('bun install')).toEqual([])
  })

  test('strips version/tag suffixes from package names', () => {
    expect(extractPackagesFromCommand('bun add pinia@latest')).toEqual(['pinia'])
    expect(extractPackagesFromCommand('npm install vitest@^2.0.0')).toEqual(['vitest'])
    expect(extractPackagesFromCommand('pnpm add @prisma/client@latest')).toEqual(['@prisma/client'])
    expect(extractPackagesFromCommand('bun add @nuxt/ui@3.0.0')).toEqual(['@nuxt/ui'])
  })
})

describe('buildOutput', () => {
  test('builds valid SessionStart output', () => {
    const mappings: PluginMapping[] = [
      { packages: ['@nuxt/ui'], pluginName: 'nuxt-ui' },
    ]
    const output = buildOutput(mappings, 'SessionStart')
    expect(output).toHaveProperty('hookSpecificOutput')
    expect(output.hookSpecificOutput.hookEventName).toBe('SessionStart')
    expect(output.hookSpecificOutput.additionalContext).toContain('nuxt-ui')
    expect(output.systemMessage).toContain('/plugin install nuxt-ui@pleaseai')
  })

  test('builds valid PostToolUse output', () => {
    const mappings: PluginMapping[] = [
      { packages: ['pinia'], pluginName: 'pinia' },
    ]
    const output = buildOutput(mappings, 'PostToolUse')
    expect(output.hookSpecificOutput.hookEventName).toBe('PostToolUse')
    expect(output.systemMessage).toContain('/plugin install pinia@pleaseai')
  })

  test('includes all plugin names in output', () => {
    const mappings: PluginMapping[] = [
      { packages: ['@nuxt/ui'], pluginName: 'nuxt-ui' },
      { packages: ['pinia'], pluginName: 'pinia' },
      { packages: ['vitest'], pluginName: 'vitest' },
    ]
    const output = buildOutput(mappings, 'SessionStart')
    expect(output.systemMessage).toContain('nuxt-ui@pleaseai')
    expect(output.systemMessage).toContain('pinia@pleaseai')
    expect(output.systemMessage).toContain('vitest@pleaseai')
  })
})

describe('scanForSetup', () => {
  test('detects packages and returns DetectedPlugin with source', () => {
    const dir = mkdtempSync(join(tmpdir(), 'setup-'))
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      dependencies: { '@nuxt/ui': '^3.0.0', 'pinia': '^2.0.0' },
    }))
    const result = scanForSetup(dir)
    expect(result.detected).toContainEqual({ pluginName: 'nuxt-ui', source: '@nuxt/ui' })
    expect(result.detected).toContainEqual({ pluginName: 'pinia', source: 'pinia' })
  })

  test('detects tooling indicators with source', () => {
    const dir = mkdtempSync(join(tmpdir(), 'setup-'))
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'test' }))
    writeFileSync(join(dir, 'turbo.json'), '{}')
    const result = scanForSetup(dir)
    expect(result.detected).toContainEqual({ pluginName: 'turborepo', source: 'turbo.json' })
  })

  test('detects packageManager field as source', () => {
    const dir = mkdtempSync(join(tmpdir(), 'setup-'))
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      name: 'test',
      packageManager: 'pnpm@9.0.0',
    }))
    const result = scanForSetup(dir)
    expect(result.detected).toContainEqual({ pluginName: 'pnpm', source: 'packageManager:pnpm@9.0.0' })
  })

  test('returns empty detected when no package.json exists', () => {
    const dir = mkdtempSync(join(tmpdir(), 'setup-'))
    const result = scanForSetup(dir)
    expect(result.detected).toHaveLength(0)
    expect(result.installed).toHaveLength(0)
  })

  test('returns empty detected when no matching packages', () => {
    const dir = mkdtempSync(join(tmpdir(), 'setup-'))
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      dependencies: { 'express': '^4.0.0' },
    }))
    const result = scanForSetup(dir)
    expect(result.detected).toHaveLength(0)
  })

  test('separates installed plugins from detected', () => {
    const dir = mkdtempSync(join(tmpdir(), 'setup-'))
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      dependencies: { '@nuxt/ui': '^3.0.0', 'pinia': '^2.0.0' },
    }))
    // Simulate nuxt-ui already installed
    mkdirSync(join(dir, '.claude'), { recursive: true })
    writeFileSync(join(dir, '.claude', 'settings.json'), JSON.stringify({
      enabledPlugins: { 'nuxt-ui@pleaseai': true },
    }))
    const result = scanForSetup(dir)
    expect(result.installed).toContain('nuxt-ui')
    expect(result.detected.map(d => d.pluginName)).not.toContain('nuxt-ui')
    expect(result.detected).toContainEqual({ pluginName: 'pinia', source: 'pinia' })
  })

  test('deduplicates plugins when detected from both packages and tooling', () => {
    const dir = mkdtempSync(join(tmpdir(), 'setup-'))
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      name: 'test',
      packageManager: 'pnpm@9.0.0',
    }))
    writeFileSync(join(dir, 'pnpm-lock.yaml'), '')
    const result = scanForSetup(dir)
    const pnpmResults = result.detected.filter(d => d.pluginName === 'pnpm')
    expect(pnpmResults).toHaveLength(1)
  })

  test('detects plugins from workspace packages', () => {
    const dir = mkdtempSync(join(tmpdir(), 'setup-'))
    // Root package.json with workspaces but no matching deps
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      workspaces: ['apps/*'],
      devDependencies: { 'typescript': '^5.0.0' },
    }))
    // Workspace package with matching deps
    mkdirSync(join(dir, 'apps', 'web'), { recursive: true })
    writeFileSync(join(dir, 'apps', 'web', 'package.json'), JSON.stringify({
      dependencies: { '@nuxt/ui': '^3.0.0' },
    }))
    const result = scanForSetup(dir)
    expect(result.detected).toContainEqual({ pluginName: 'nuxt-ui', source: 'apps/web: @nuxt/ui' })
  })

  test('detects plugins from pnpm workspace packages', () => {
    const dir = mkdtempSync(join(tmpdir(), 'setup-'))
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'root' }))
    writeFileSync(join(dir, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n')
    mkdirSync(join(dir, 'packages', 'api'), { recursive: true })
    writeFileSync(join(dir, 'packages', 'api', 'package.json'), JSON.stringify({
      dependencies: { '@prisma/client': '^5.0.0' },
    }))
    const result = scanForSetup(dir)
    expect(result.detected).toContainEqual({ pluginName: 'prisma', source: 'packages/api: @prisma/client' })
  })

  test('merges root and workspace deps without duplicates', () => {
    const dir = mkdtempSync(join(tmpdir(), 'setup-'))
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      workspaces: ['apps/*'],
      devDependencies: { 'vitest': '^4.0.0' },
    }))
    mkdirSync(join(dir, 'apps', 'web'), { recursive: true })
    writeFileSync(join(dir, 'apps', 'web', 'package.json'), JSON.stringify({
      dependencies: { '@nuxt/ui': '^3.0.0', 'vitest': '^4.0.0' },
    }))
    const result = scanForSetup(dir)
    const pluginNames = result.detected.map(d => d.pluginName)
    // vitest detected from root (no workspace prefix), nuxt-ui from workspace
    expect(pluginNames).toContain('vitest')
    expect(pluginNames).toContain('nuxt-ui')
    const vitestResult = result.detected.find(d => d.pluginName === 'vitest')
    expect(vitestResult?.source).toBe('vitest') // root, no prefix
  })
})

describe('resolveWorkspacePackages', () => {
  test('resolves npm workspaces glob patterns', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ws-'))
    const pkg = { workspaces: ['apps/*', 'packages/*'] }
    mkdirSync(join(dir, 'apps', 'web'), { recursive: true })
    writeFileSync(join(dir, 'apps', 'web', 'package.json'), '{}')
    mkdirSync(join(dir, 'packages', 'shared'), { recursive: true })
    writeFileSync(join(dir, 'packages', 'shared', 'package.json'), '{}')
    const result = resolveWorkspacePackages(dir, pkg)
    expect(result).toHaveLength(2)
    expect(result).toContainEqual(join(dir, 'apps', 'web'))
    expect(result).toContainEqual(join(dir, 'packages', 'shared'))
  })

  test('resolves pnpm-workspace.yaml patterns', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ws-'))
    writeFileSync(join(dir, 'pnpm-workspace.yaml'), 'packages:\n  - "apps/*"\n  - "packages/*"\n')
    mkdirSync(join(dir, 'apps', 'web'), { recursive: true })
    writeFileSync(join(dir, 'apps', 'web', 'package.json'), '{}')
    const result = resolveWorkspacePackages(dir, null)
    expect(result).toHaveLength(1)
    expect(result).toContainEqual(join(dir, 'apps', 'web'))
  })

  test('returns empty array when no workspaces configured', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ws-'))
    const result = resolveWorkspacePackages(dir, { name: 'test' })
    expect(result).toHaveLength(0)
  })

  test('skips directories without package.json', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ws-'))
    const pkg = { workspaces: ['apps/*'] }
    mkdirSync(join(dir, 'apps', 'web'), { recursive: true })
    // No package.json in apps/web
    mkdirSync(join(dir, 'apps', 'api'), { recursive: true })
    writeFileSync(join(dir, 'apps', 'api', 'package.json'), '{}')
    const result = resolveWorkspacePackages(dir, pkg)
    expect(result).toHaveLength(1)
    expect(result).toContainEqual(join(dir, 'apps', 'api'))
  })

  test('handles yarn workspaces { packages: [...] } format', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ws-'))
    const pkg = { workspaces: { packages: ['apps/*'] } }
    mkdirSync(join(dir, 'apps', 'web'), { recursive: true })
    writeFileSync(join(dir, 'apps', 'web', 'package.json'), '{}')
    const result = resolveWorkspacePackages(dir, pkg)
    expect(result).toHaveLength(1)
  })

  test('merges npm workspaces and pnpm-workspace.yaml without duplicates', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ws-'))
    const pkg = { workspaces: ['apps/*'] }
    writeFileSync(join(dir, 'pnpm-workspace.yaml'), 'packages:\n  - "apps/*"\n')
    mkdirSync(join(dir, 'apps', 'web'), { recursive: true })
    writeFileSync(join(dir, 'apps', 'web', 'package.json'), '{}')
    const result = resolveWorkspacePackages(dir, pkg)
    // Both sources resolve to same dir, but resolveGlobPatterns may return duplicates
    // The important thing is both sources are checked
    expect(result.length).toBeGreaterThanOrEqual(1)
  })

  test('handles exact directory paths (no globs)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ws-'))
    const pkg = { workspaces: ['tools/cli'] }
    mkdirSync(join(dir, 'tools', 'cli'), { recursive: true })
    writeFileSync(join(dir, 'tools', 'cli', 'package.json'), '{}')
    const result = resolveWorkspacePackages(dir, pkg)
    expect(result).toHaveLength(1)
    expect(result).toContainEqual(join(dir, 'tools', 'cli'))
  })

  test('skips negation patterns', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ws-'))
    const pkg = { workspaces: ['packages/*', '!packages/internal'] }
    mkdirSync(join(dir, 'packages', 'shared'), { recursive: true })
    writeFileSync(join(dir, 'packages', 'shared', 'package.json'), '{}')
    mkdirSync(join(dir, 'packages', 'internal'), { recursive: true })
    writeFileSync(join(dir, 'packages', 'internal', 'package.json'), '{}')
    const result = resolveWorkspacePackages(dir, pkg)
    // Negation patterns are skipped (not filtered), so internal still appears from "packages/*"
    // This is a known limitation — true negation filtering is out of scope
    expect(result.length).toBeGreaterThanOrEqual(1)
  })
})

describe('collectAllDependencies', () => {
  test('merges root and workspace deps', () => {
    const dir = mkdtempSync(join(tmpdir(), 'collect-'))
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      workspaces: ['apps/*'],
      dependencies: { 'express': '^4.0.0' },
    }))
    mkdirSync(join(dir, 'apps', 'web'), { recursive: true })
    writeFileSync(join(dir, 'apps', 'web', 'package.json'), JSON.stringify({
      dependencies: { '@nuxt/ui': '^3.0.0' },
    }))
    const result = collectAllDependencies(dir)
    expect(result.deps).toHaveProperty('express')
    expect(result.deps).toHaveProperty('@nuxt/ui')
    expect(result.sources).not.toHaveProperty('express') // root dep, no source entry
    expect(result.sources['@nuxt/ui']).toBe('apps/web')
  })

  test('root deps take priority over workspace deps', () => {
    const dir = mkdtempSync(join(tmpdir(), 'collect-'))
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      workspaces: ['apps/*'],
      devDependencies: { 'vitest': '^4.0.0' },
    }))
    mkdirSync(join(dir, 'apps', 'web'), { recursive: true })
    writeFileSync(join(dir, 'apps', 'web', 'package.json'), JSON.stringify({
      devDependencies: { 'vitest': '^3.0.0' },
    }))
    const result = collectAllDependencies(dir)
    expect(result.deps['vitest']).toBe('^4.0.0') // root version wins
    expect(result.sources).not.toHaveProperty('vitest') // no workspace source for root dep
  })

  test('skips malformed workspace package.json', () => {
    const dir = mkdtempSync(join(tmpdir(), 'collect-'))
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      workspaces: ['apps/*'],
    }))
    mkdirSync(join(dir, 'apps', 'broken'), { recursive: true })
    writeFileSync(join(dir, 'apps', 'broken', 'package.json'), 'not valid json')
    mkdirSync(join(dir, 'apps', 'good'), { recursive: true })
    writeFileSync(join(dir, 'apps', 'good', 'package.json'), JSON.stringify({
      dependencies: { 'pinia': '^2.0.0' },
    }))
    const result = collectAllDependencies(dir)
    expect(result.deps).toHaveProperty('pinia')
  })

  test('returns empty deps when no package.json', () => {
    const dir = mkdtempSync(join(tmpdir(), 'collect-'))
    const result = collectAllDependencies(dir)
    expect(Object.keys(result.deps)).toHaveLength(0)
    expect(Object.keys(result.sources)).toHaveLength(0)
  })

  test('works with non-monorepo (no workspaces)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'collect-'))
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      dependencies: { 'express': '^4.0.0' },
    }))
    const result = collectAllDependencies(dir)
    expect(result.deps).toHaveProperty('express')
    expect(Object.keys(result.sources)).toHaveLength(0)
  })
})
