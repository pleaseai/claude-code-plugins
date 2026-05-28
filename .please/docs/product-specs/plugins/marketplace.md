---
id: SPEC-001
level: V_M
domain: plugins
feature: marketplace
depends: []
conflicts: []
traces: []
created_at: 2026-05-28T10:00:49.494Z
updated_at: 2026-05-28T10:00:49.494Z
source_tracks: ["awesome-copilot-java-20260528"]
---

# Marketplace Specification

## Purpose

Marketplace Specification 관련 요구사항.

## Requirements

### Requirement: A new built-in plugin directory `plugins/java-development/` exists, containing a Claude Code plugin manifest at `plugins/java-development/.claude-plugin/plugin.json` with the plugin name `java-development`, version `1.0.0`, MIT license, and Java-related keywords (java, springboot, junit, javadoc).
<!-- req: REQ-001 tracks=awesome-copilot-java-20260528 -->

The system MUST A new built-in plugin directory `plugins/java-development/` exists, containing a Claude Code plugin manifest at `plugins/java-development/.claude-plugin/plugin.json` with the plugin name `java-development`, version `1.0.0`, MIT license, and Java-related keywords (java, springboot, junit, javadoc).

#### Scenario: A new built-in plugin directory `plugins/java-development/` exists, containing a Claude Code plugin manifest at `plugins/java-development/.claude-plugin/plugin.json` with the plugin name `java-development`, version `1.0.0`, MIT license, and Java-related keywords (java, springboot, junit, javadoc).

- GIVEN 시스템이 정상 동작 중일 때
- WHEN A new built-in plugin directory `plugins/java-development/` exists, containing a Claude Code plugin manifest at `plugins/java-development/.claude-plugin/plugin.json` with the plugin name `java-development`, version `1.0.0`, MIT license, and Java-related keywords (java, springboot, junit, javadoc).
- THEN 해당 기능이 정상적으로 수행된다

### Requirement: All four upstream skills are copied as-is (no content edits) into `plugins/java-development/skills/{skill-name}/SKILL.md`:
<!-- req: REQ-002 tracks=awesome-copilot-java-20260528 -->

The system MUST All four upstream skills are copied as-is (no content edits) into `plugins/java-development/skills/{skill-name}/SKILL.md`:.

#### Scenario: All four upstream skills are copied as-is (no content edits) into `plugins/java-development/skills/{skill-name}/SKILL.md`:

- GIVEN 시스템이 정상 동작 중일 때
- WHEN All four upstream skills are copied as-is (no content edits) into `plugins/java-development/skills/{skill-name}/SKILL.md`:
- THEN 해당 기능이 정상적으로 수행된다

### Requirement: The plugin is registered in `.claude-plugin/marketplace.json` so it appears in marketplace listings and is installable via `/plugin install java-development@pleaseai`.
<!-- req: REQ-003 tracks=awesome-copilot-java-20260528 -->

The system MUST The plugin is registered in `.claude-plugin/marketplace.json` so it appears in marketplace listings and is installable via `/plugin install java-development@pleaseai`.

#### Scenario: The plugin is registered in `.claude-plugin/marketplace.json` so it appears in marketplace listings and is installable via `/plugin install java-development@pleaseai`.

- GIVEN 시스템이 정상 동작 중일 때
- WHEN The plugin is registered in `.claude-plugin/marketplace.json` so it appears in marketplace listings and is installable via `/plugin install java-development@pleaseai`.
- THEN 해당 기능이 정상적으로 수행된다

### Requirement: A `plugins/java-development/README.md` documents the source (link to upstream), included skills, installation command, and license attribution.
<!-- req: REQ-004 tracks=awesome-copilot-java-20260528 -->

The system MUST A `plugins/java-development/README.md` documents the source (link to upstream), included skills, installation command, and license attribution.

#### Scenario: A `plugins/java-development/README.md` documents the source (link to upstream), included skills, installation command, and license attribution.

- GIVEN 시스템이 정상 동작 중일 때
- WHEN A `plugins/java-development/README.md` documents the source (link to upstream), included skills, installation command, and license attribution.
- THEN 해당 기능이 정상적으로 수행된다

### Requirement: Attribution is preserved: the upstream license file (MIT) is included as `plugins/java-development/LICENSE` (or referenced inline), and `plugin.json` lists the author as Awesome Copilot Community with `repository` pointing to `https://github.com/github/awesome-copilot`.
<!-- req: REQ-005 tracks=awesome-copilot-java-20260528 -->

The system MUST Attribution is preserved: the upstream license file (MIT) is included as `plugins/java-development/LICENSE` (or referenced inline), and `plugin.json` lists the author as Awesome Copilot Community with `repository` pointing to `https://github.com/github/awesome-copilot`.

#### Scenario: Attribution is preserved: the upstream license file (MIT) is included as `plugins/java-development/LICENSE` (or referenced inline), and `plugin.json` lists the author as Awesome Copilot Community with `repository` pointing to `https://github.com/github/awesome-copilot`.

- GIVEN 시스템이 정상 동작 중일 때
- WHEN Attribution is preserved: the upstream license file (MIT) is included as `plugins/java-development/LICENSE` (or referenced inline), and `plugin.json` lists the author as Awesome Copilot Community with `repository` pointing to `https://github.com/github/awesome-copilot`.
- THEN 해당 기능이 정상적으로 수행된다

### Requirement: Multi-runtime artifacts for Codex and Antigravity are generated by running `bun scripts/cli.ts multi-format` so the plugin is installable across all three runtimes — matching the convention established for other built-in plugins.
<!-- req: REQ-006 tracks=awesome-copilot-java-20260528 -->

The system MUST Multi-runtime artifacts for Codex and Antigravity are generated by running `bun scripts/cli.ts multi-format` so the plugin is installable across all three runtimes — matching the convention established for other built-in plugins.

#### Scenario: Multi-runtime artifacts for Codex and Antigravity are generated by running `bun scripts/cli.ts multi-format` so the plugin is installable across all three runtimes — matching the convention established for other built-in plugins.

- GIVEN 시스템이 정상 동작 중일 때
- WHEN Multi-runtime artifacts for Codex and Antigravity are generated by running `bun scripts/cli.ts multi-format` so the plugin is installable across all three runtimes — matching the convention established for other built-in plugins.
- THEN 해당 기능이 정상적으로 수행된다

## Non-functional Requirements

### Requirement: Skill content remains byte-identical to upstream `SKILL.md` files (provenance + future re-sync feasibility); only the plugin manifest is locally authored.
<!-- req: REQ-007 tracks=awesome-copilot-java-20260528 -->

The system SHOULD Skill content remains byte-identical to upstream `SKILL.md` files (provenance + future re-sync feasibility); only the plugin manifest is locally authored.

### Requirement: Plugin passes `claude plugin validate plugins/java-development/` without errors before being added to the marketplace.
<!-- req: REQ-008 tracks=awesome-copilot-java-20260528 -->

The system SHOULD Plugin passes `claude plugin validate plugins/java-development/` without errors before being added to the marketplace.

### Requirement: License notice and upstream attribution are visible in both `plugin.json` and `README.md` (legal/discoverability requirement for an MIT-licensed third-party import).
<!-- req: REQ-009 tracks=awesome-copilot-java-20260528 -->

The system SHOULD License notice and upstream attribution are visible in both `plugin.json` and `README.md` (legal/discoverability requirement for an MIT-licensed third-party import).
