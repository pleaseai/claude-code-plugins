/**
 * Skill source configuration for antfu-based plugins.
 * Mirrors the structure of vendor/antfu-skills/meta.ts but managed in this repo.
 *
 * To add a new source (Type 1):
 *   1. Add an entry to `submodules` below
 *   2. Run: bun scripts/cli.ts init
 *   3. Generate skills: /generate-skill <name>
 *   4. Add skill → plugin mapping to SKILL_TO_PLUGIN in scripts/cli.ts
 *   5. Run: bun scripts/cli.ts sync
 *
 * To add a new vendor (Type 2):
 *   1. Add an entry to `vendors` below
 *   2. Add skill → plugin mapping to SKILL_TO_PLUGIN in scripts/cli.ts
 *   3. Run: bun scripts/cli.ts init
 *   4. Run: bun scripts/cli.ts sync
 */

export interface SubmoduleMeta {
  /** Git repository URL */
  source: string
  /** Shallow clone depth (e.g. 1). Omit for full clone. */
  depth?: number
}

export interface VendorMeta {
  /** Git repository URL */
  source: string
  /** Shallow clone depth (e.g. 1). Omit for full clone. */
  depth?: number
  /** Path within the vendor repo where skills live. Defaults to "skills". Use "." for repos where skills are at root. */
  skillsDir?: string
  /** sourceSkillName → outputSkillName mapping */
  skills: Record<string, string>
}

/**
 * Type 1: Repositories to clone as submodules and generate skills from source docs.
 * Submodules are added at sources/{name}/ in this repo.
 * Skills are generated manually using /generate-skill <name>.
 */
export const submodules: Record<string, string | SubmoduleMeta> = {
  vue: "https://github.com/vuejs/docs",
}

/**
 * Type 2: Projects that already maintain their own skills/ directory.
 * Submodules are added at vendor/{name}/ in this repo.
 * Skills are synced automatically via `bun scripts/cli.ts sync`.
 */
export const vendors: Record<string, VendorMeta> = {
  "web-design-guidelines": {
    source: "https://github.com/vercel-labs/agent-skills",
    skills: {
      "web-design-guidelines": "web-design-guidelines",
    },
  },
  "nuxt-ui": {
    source: "https://github.com/nuxt/ui",
    skills: {
      "nuxt-ui": "nuxt-ui",
    },
  },
  "better-auth": {
    source: "https://github.com/better-auth/skills",
    skillsDir: "better-auth",
    skills: {
      "best-practices": "best-practices",
      "create-auth": "create-auth",
      emailAndPassword: "emailAndPassword",
      organization: "organization",
      twoFactor: "twoFactor",
    },
  },
  "agent-browser": {
    source: "https://github.com/vercel-labs/agent-browser",
    skills: {
      "agent-browser": "agent-browser",
      dogfood: "dogfood",
      electron: "electron",
      slack: "slack",
    },
  },
  "ai-sdk": {
    source: "https://github.com/vercel/ai",
    skills: {
      "use-ai-sdk": "use-ai-sdk",
    },
  },
}

/**
 * Type 3: Hand-written skills by Anthony Fu.
 * Migrated to skills.sh — no longer synced from vendor/antfu-skills.
 */
export const manual: string[] = []

export interface ExtensionMeta {
  /** Git repository URL */
  source: string
  /** Shallow clone depth (e.g. 1). Omit for full clone. */
  depth?: number
  /** Override plugin name (defaults to extension key name) */
  pluginName?: string
  /** Skip TOML command conversion */
  skipCommands?: boolean
  /** Skip skills/ directory sync */
  skipSkills?: boolean
}

/**
 * Type 4: Gemini CLI extensions maintained as git submodules in external-plugins/.
 * Submodules stay in external-plugins/<name>/ as read-only sources.
 * Generated plugin artifacts (plugin.json, hooks, commands) go to plugins/<name>/.
 *
 * To add a new extension:
 *   1. Add an entry to `extensions` below
 *   2. Run: bun scripts/cli.ts init
 *   3. Run: bun scripts/cli.ts sync
 */
export const extensions: Record<string, ExtensionMeta> = {
  "google-workspace": {
    source: "https://github.com/googleworkspace/cli",
  },
}
