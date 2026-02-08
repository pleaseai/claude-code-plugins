#!/usr/bin/env bash
# Generate Claude Code plugins from vendor/antfu-skills
# Idempotent: safe to run multiple times
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENDOR_SKILLS="$REPO_ROOT/vendor/antfu-skills/skills"
PLUGINS_DIR="$REPO_ROOT/plugins"

if [ ! -d "$VENDOR_SKILLS" ]; then
  echo "ERROR: vendor/antfu-skills/skills not found. Run: git submodule update --init" >&2
  exit 1
fi

# skill-name -> plugin-name mapping
declare -A SKILL_TO_PLUGIN=(
  [antfu]=antfu
  [nuxt]=nuxt
  [pinia]=pinia
  [pnpm]=pnpm
  [slidev]=slidev
  [tsdown]=tsdown
  [turborepo]=turborepo
  [unocss]=unocss
  [vite]=vite
  [vitepress]=vitepress
  [vitest]=vitest
  [vue]=vue
  [vue-best-practices]=vue
  [vue-router-best-practices]=vue
  [vue-testing-best-practices]=vue
  [vueuse-functions]=vueuse
  [web-design-guidelines]=web-design
)

# plugin -> description (manual overrides for composite/multiline/long descriptions)
declare -A PLUGIN_DESCRIPTIONS=(
  [antfu]="Anthony Fu's opinionated tooling and conventions for JavaScript/TypeScript projects"
  [slidev]="Create and present web-based slides for developers using Markdown, Vue components, code highlighting, and animations"
  [tsdown]="Bundle TypeScript and JavaScript libraries with blazing-fast speed powered by Rolldown"
  [turborepo]="Turborepo monorepo build system guidance for task pipelines, caching, CI optimization, and the turbo CLI"
  [vue]="Vue 3 core, best practices, router patterns, and testing"
  [vueuse]="Apply VueUse composables where appropriate to build concise, maintainable Vue.js / Nuxt features"
  [web-design]="Review UI code for Web Interface Guidelines compliance"
)

# plugin -> keywords
declare -A PLUGIN_KEYWORDS=(
  [antfu]='["antfu", "conventions", "eslint", "typescript"]'
  [nuxt]='["nuxt", "vue", "ssr", "antfu"]'
  [pinia]='["pinia", "vue", "state-management", "antfu"]'
  [pnpm]='["pnpm", "package-manager", "monorepo", "antfu"]'
  [slidev]='["slidev", "slides", "presentation", "antfu"]'
  [tsdown]='["tsdown", "bundler", "typescript", "antfu"]'
  [turborepo]='["turborepo", "monorepo", "build-system", "antfu"]'
  [unocss]='["unocss", "css", "atomic-css", "antfu"]'
  [vite]='["vite", "build-tool", "bundler", "antfu"]'
  [vitepress]='["vitepress", "documentation", "static-site", "antfu"]'
  [vitest]='["vitest", "testing", "unit-test", "antfu"]'
  [vue]='["vue", "vue3", "composition-api", "antfu"]'
  [vueuse]='["vueuse", "vue", "composables", "antfu"]'
  [web-design]='["web-design", "ui", "accessibility", "antfu"]'
)

# Extract description from SKILL.md frontmatter
extract_description() {
  local skill_dir="$1"
  local skill_md="$skill_dir/SKILL.md"
  if [ ! -f "$skill_md" ]; then
    echo ""
    return
  fi
  # Handle multiline description (e.g. turborepo uses |)
  awk '
    /^---$/ { count++; next }
    count == 1 && /^description:/ {
      # Check for inline value
      sub(/^description:[[:space:]]*/, "")
      if ($0 != "" && $0 != "|" && $0 != ">") {
        # Remove surrounding quotes if present
        gsub(/^["'\'']|["'\'']$/, "")
        print
        exit
      }
      # Multiline: read next line
      getline
      # Trim leading whitespace
      sub(/^[[:space:]]+/, "")
      print
      exit
    }
  ' "$skill_md"
}

# Get the primary skill name for a plugin (for homepage URL)
primary_skill_for_plugin() {
  local plugin="$1"
  case "$plugin" in
    vueuse) echo "vueuse-functions" ;;
    web-design) echo "web-design-guidelines" ;;
    *) echo "$plugin" ;;
  esac
}

# Collect unique plugin names
declare -A SEEN_PLUGINS
PLUGIN_LIST=()
for skill in "${!SKILL_TO_PLUGIN[@]}"; do
  plugin="${SKILL_TO_PLUGIN[$skill]}"
  if [ -z "${SEEN_PLUGINS[$plugin]:-}" ]; then
    SEEN_PLUGINS[$plugin]=1
    PLUGIN_LIST+=("$plugin")
  fi
done

# Sort for deterministic output
IFS=$'\n' PLUGIN_LIST=($(sort <<<"${PLUGIN_LIST[*]}")); unset IFS

echo "Generating ${#PLUGIN_LIST[@]} plugins..."

for plugin in "${PLUGIN_LIST[@]}"; do
  plugin_dir="$PLUGINS_DIR/$plugin"
  manifest_dir="$plugin_dir/.claude-plugin"
  skills_dir="$plugin_dir/skills"

  # Create directories
  mkdir -p "$manifest_dir" "$skills_dir"

  # Determine description
  if [ -n "${PLUGIN_DESCRIPTIONS[$plugin]:-}" ]; then
    desc="${PLUGIN_DESCRIPTIONS[$plugin]}"
  else
    primary_skill=$(primary_skill_for_plugin "$plugin")
    desc=$(extract_description "$VENDOR_SKILLS/$primary_skill")
  fi

  # Truncate description at first sentence if too long (keep under 200 chars)
  if [ ${#desc} -gt 200 ]; then
    desc="${desc:0:197}..."
  fi

  # Get keywords
  keywords="${PLUGIN_KEYWORDS[$plugin]:-\"[\"$plugin\", \"antfu\"]\"}"

  # Get primary skill for homepage
  primary_skill=$(primary_skill_for_plugin "$plugin")

  # Write plugin.json
  cat > "$manifest_dir/plugin.json" <<MANIFEST
{
  "name": "$plugin",
  "version": "1.0.0",
  "description": "$desc",
  "author": {
    "name": "Anthony Fu",
    "url": "https://github.com/antfu"
  },
  "homepage": "https://github.com/antfu/skills/tree/main/skills/$primary_skill",
  "repository": "https://github.com/antfu/skills",
  "license": "MIT",
  "keywords": $keywords
}
MANIFEST

  # Create skill symlinks
  for skill in "${!SKILL_TO_PLUGIN[@]}"; do
    if [ "${SKILL_TO_PLUGIN[$skill]}" = "$plugin" ]; then
      target="../../../vendor/antfu-skills/skills/$skill"
      link="$skills_dir/$skill"
      # Remove existing symlink/dir for idempotency
      rm -rf "$link"
      ln -s "$target" "$link"
    fi
  done

  # Special case: turborepo has commands
  if [ "$plugin" = "turborepo" ]; then
    commands_dir="$plugin_dir/commands"
    mkdir -p "$commands_dir"
    target="../../../vendor/antfu-skills/skills/turborepo/command/turborepo.md"
    link="$commands_dir/turborepo.md"
    rm -rf "$link"
    ln -s "$target" "$link"
  fi

  echo "  ✓ $plugin"
done

echo "Done. Generated ${#PLUGIN_LIST[@]} plugins in plugins/"
