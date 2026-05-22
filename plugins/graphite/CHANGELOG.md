# Changelog

## [2.0.0](https://github.com/pleaseai/claude-code-plugins/compare/graphite-v1.3.0...graphite-v2.0.0) (2026-05-22)


### ⚠ BREAKING CHANGES

* **graphite:** repos that used the old schema   graphite:     enabled: true will no longer be detected via the .please/config.yml path. The .graphite_repo_config file-based detection path is unaffected.

### Features

* **graphite:** add merge queue label workflow with mode-aware dispatch ([#186](https://github.com/pleaseai/claude-code-plugins/issues/186)) ([f0da5e8](https://github.com/pleaseai/claude-code-plugins/commit/f0da5e8b476966ef75c36f8422ca0a767f879b72))
* **graphite:** migrate opt-in to workflow.stacked_pr.tool ([#189](https://github.com/pleaseai/claude-code-plugins/issues/189)) ([8e33377](https://github.com/pleaseai/claude-code-plugins/commit/8e33377faf5d1dab0503d8293d00b49f6b1e56f8))

## [1.3.0](https://github.com/pleaseai/claude-code-plugins/compare/graphite-v1.2.0...graphite-v1.3.0) (2026-05-21)


### Features

* add multi-format plugin manifest generator (Codex + Antigravity) ([#185](https://github.com/pleaseai/claude-code-plugins/issues/185)) ([269eaf3](https://github.com/pleaseai/claude-code-plugins/commit/269eaf3d459a0543b396f92b2aa3691106414e71))
* **graphite:** also activate context hook via .please/config.yml opt-in ([#181](https://github.com/pleaseai/claude-code-plugins/issues/181)) ([bf9cca1](https://github.com/pleaseai/claude-code-plugins/commit/bf9cca1c60479bb537be920ca68a7ab0d53cdc2b))

## [1.2.0](https://github.com/pleaseai/claude-code-plugins/compare/graphite-v1.1.0...graphite-v1.2.0) (2026-05-20)


### Features

* **graphite:** add graphite-setup skill for repo/CI configuration ([#177](https://github.com/pleaseai/claude-code-plugins/issues/177)) ([f1691d9](https://github.com/pleaseai/claude-code-plugins/commit/f1691d93587f310e4931d2ae7e2b25bbe7e66173))

## [1.1.0](https://github.com/pleaseai/claude-code-plugins/compare/graphite-v1.0.0...graphite-v1.1.0) (2026-05-20)


### Features

* add graphite plugin for stacked-PR workflows with gt CLI ([#170](https://github.com/pleaseai/claude-code-plugins/issues/170)) ([6b19bf5](https://github.com/pleaseai/claude-code-plugins/commit/6b19bf5c7a633a8accece0238b891d6b13c4f3f6))
* **graphite:** add SessionStart hook to detect .graphite_repo_config ([#171](https://github.com/pleaseai/claude-code-plugins/issues/171)) ([ce9b99b](https://github.com/pleaseai/claude-code-plugins/commit/ce9b99bacb6ea8a757b0b4761de0e5883ab65ea8))
