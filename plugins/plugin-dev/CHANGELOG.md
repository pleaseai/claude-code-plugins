# Changelog

All notable changes to the plugin-dev plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-07-07

### Added
- `/plugin-dev:multi-format` command — generate Codex, Antigravity, and Cursor manifests from the Claude Code source of truth
- `plugin-authoring` skill — teaches the author-once → multi-format workflow so the plugin is self-contained across runtimes

### Changed
- `/plugin-dev:scaffold` now chains into the multi-format generator so a new plugin loads in all four runtimes in one flow

## [1.0.0] - 2025-10-17

### Added
- Initial release of plugin-dev toolkit
- `/plugin-dev:best-practices` command for comprehensive guidance
- `/plugin-dev:validate` command for plugin structure validation
- `/plugin-dev:scaffold` command for creating new plugins
- `/plugin-dev:migrate-gemini` command for Gemini CLI extension migration
- PostToolUse hook for automatic plugin.json validation
- Comprehensive README with examples and best practices
- MIT License
- Complete documentation structure

### Features
- Real-time validation of plugin manifests
- Automatic detection of common plugin issues
- Best practices guidance based on official documentation
- Scaffolding templates with proper structure
- Gemini CLI to Claude Code migration support

### Documentation
- Detailed command usage examples
- Best practices summary
- Common issues and solutions
- Development workflow guidelines
- Resource links to official documentation
