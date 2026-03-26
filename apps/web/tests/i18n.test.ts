import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const localesDir = join(__dirname, '../i18n/locales')

function getKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return getKeys(value as Record<string, unknown>, fullKey)
    }
    return [fullKey]
  })
}

function loadLocale(filename: string): Record<string, unknown> {
  const content = readFileSync(join(localesDir, filename), 'utf-8')
  return JSON.parse(content)
}

describe('i18n locale files', () => {
  const files = readdirSync(localesDir).filter(f => f.endsWith('.json'))
  const locales = Object.fromEntries(
    files.map(f => [f.replace('.json', ''), loadLocale(f)]),
  )
  const referenceKeys = getKeys(locales.en!).sort()

  it('should have all expected locale files', () => {
    expect(files.sort()).toEqual(['en.json', 'ja.json', 'ko.json', 'zh.json'])
  })

  it('should parse all locale files as valid JSON', () => {
    for (const file of files) {
      expect(() => loadLocale(file)).not.toThrow()
    }
  })

  for (const [locale, data] of Object.entries(locales)) {
    if (locale === 'en') continue

    it(`${locale}.json should have the same keys as en.json`, () => {
      const keys = getKeys(data).sort()
      expect(keys).toEqual(referenceKeys)
    })
  }
})
