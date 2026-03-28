import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  buildOutput,
  detectPackages,
  detectTooling,
  extractPackagesFromCommand,
  filterInstalledPlugins,
  type PluginMapping,
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
    { indicators: { lockFiles: ['pnpm-lock.yaml'], packageManager: 'pnpm' }, pluginName: 'pnpm' },
    { indicators: { lockFiles: ['turbo.json'], packageManager: null }, pluginName: 'turborepo' },
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
