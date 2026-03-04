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

export interface VendorMeta {
  /** Git repository URL */
  source: string
  /** sourceSkillName → outputSkillName mapping */
  skills: Record<string, string>
}

/**
 * Type 1: Repositories to clone as submodules and generate skills from source docs.
 * Submodules are added at sources/{name}/ in this repo.
 * Skills are generated manually using /generate-skill <name>.
 */
export const submodules: Record<string, string> = {
  vue: "https://github.com/vuejs/docs",
  nuxt: "https://github.com/nuxt/nuxt",
  vite: "https://github.com/vitejs/vite",
  unocss: "https://github.com/unocss/unocss",
  pnpm: "https://github.com/pnpm/pnpm.io",
  pinia: "https://github.com/vuejs/pinia",
  vitest: "https://github.com/vitest-dev/vitest",
  vitepress: "https://github.com/vuejs/vitepress",
}

/**
 * Type 2: Projects that already maintain their own skills/ directory.
 * Submodules are added at vendor/{name}/ in this repo.
 * Skills are synced automatically via `bun scripts/cli.ts sync`.
 */
export const vendors: Record<string, VendorMeta> = {
  slidev: {
    source: "https://github.com/slidevjs/slidev",
    skills: {
      slidev: "slidev",
    },
  },
  vueuse: {
    source: "https://github.com/vueuse/skills",
    skills: {
      "vueuse-functions": "vueuse-functions",
    },
  },
  tsdown: {
    source: "https://github.com/rolldown/tsdown",
    skills: {
      tsdown: "tsdown",
    },
  },
  "vuejs-ai": {
    source: "https://github.com/vuejs-ai/skills",
    skills: {
      "vue-best-practices": "vue-best-practices",
      "vue-router-best-practices": "vue-router-best-practices",
      "vue-testing-best-practices": "vue-testing-best-practices",
    },
  },
  turborepo: {
    source: "https://github.com/vercel/turborepo",
    skills: {
      turborepo: "turborepo",
    },
  },
  "web-design-guidelines": {
    source: "https://github.com/vercel-labs/agent-skills",
    skills: {
      "web-design-guidelines": "web-design-guidelines",
    },
  },
}

/**
 * Type 3: Hand-written skills by Anthony Fu.
 * These live in vendor/antfu-skills/skills/ and are copied directly to plugins/{plugin}/skills/ by the sync script.
 */
export const manual: string[] = ["antfu"]
