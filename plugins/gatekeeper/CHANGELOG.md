# Changelog

## [1.2.0](https://github.com/pleaseai/claude-code-plugins/compare/gatekeeper-v1.1.1...gatekeeper-v1.2.0) (2026-02-25)


### Features

* **gatekeeper:** add chain command parsing in Layer 1 ([#38](https://github.com/pleaseai/claude-code-plugins/issues/38)) ([1f1b36c](https://github.com/pleaseai/claude-code-plugins/commit/1f1b36cf85abfcdd05204233ae3fbb291bdd96ce))
* **gatekeeper:** change PermissionRequest agent model to sonnet ([#36](https://github.com/pleaseai/claude-code-plugins/issues/36)) ([f38e10f](https://github.com/pleaseai/claude-code-plugins/commit/f38e10f1be9e8f088ced7079aa999d6b790ecd14))


### Bug Fixes

* **gatekeeper:** improve chain parser and security rules ([#39](https://github.com/pleaseai/claude-code-plugins/issues/39)) ([a718b47](https://github.com/pleaseai/claude-code-plugins/commit/a718b4773dccb506e15c1a98f47e3467af82d45f))

## [1.2.0](https://github.com/pleaseai/claude-code-plugins/compare/gatekeeper-v1.1.1...gatekeeper-v1.2.0) (2026-02-24)


### Features

* **gatekeeper:** add chain command parsing in Layer 1 to detect chained command abuse ([4fa5b37](https://github.com/pleaseai/claude-code-plugins/commit/4fa5b37))
* **gatekeeper:** change PermissionRequest agent model from opus to sonnet for faster response ([f38e10f](https://github.com/pleaseai/claude-code-plugins/commit/f38e10f))


### Bug Fixes

* **gatekeeper:** address security gaps in DENY rules and chain parser ([3ef548b](https://github.com/pleaseai/claude-code-plugins/commit/3ef548b))
* **gatekeeper:** address security vulnerabilities in chain command parsing ([f6515cc](https://github.com/pleaseai/claude-code-plugins/commit/f6515cc))

## [1.1.1](https://github.com/pleaseai/claude-code-plugins/compare/gatekeeper-v1.1.0...gatekeeper-v1.1.1) (2026-02-11)


### Bug Fixes

* **gatekeeper:** remove duplicate hooks reference from plugin.json ([#33](https://github.com/pleaseai/claude-code-plugins/issues/33)) ([ef01bf2](https://github.com/pleaseai/claude-code-plugins/commit/ef01bf2e0b049a2b79eafcd8074a8522a5320ab1))

## [1.1.0](https://github.com/pleaseai/claude-code-plugins/compare/gatekeeper-v1.0.0...gatekeeper-v1.1.0) (2026-02-11)


### Features

* add gatekeeper plugin for auto-approve safe commands ([#30](https://github.com/pleaseai/claude-code-plugins/issues/30)) ([95fa45e](https://github.com/pleaseai/claude-code-plugins/commit/95fa45ea87f8612d89262ddf1010bda536f2ecca))
