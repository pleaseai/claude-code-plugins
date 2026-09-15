# Firebase Plugin for Claude Code

The Firebase MCP server plus the official [Firebase Agent Skills](https://github.com/firebase/agent-skills) — manage Firebase projects, add backend services, build AI features, and deploy & host apps.

## Features

### Firebase MCP Server

The plugin runs the MCP server bundled with the Firebase CLI (`npx -y firebase-tools mcp --dir .`), scoped to the current working directory. It exposes tools for inspecting and managing your Firebase project, its resources, and its data.

Authenticate the CLI once before use:

```sh
npx firebase-tools login
```

### Firebase Agent Skills

Thirteen skills from `firebase/agent-skills` load on demand:

| Skill | Covers |
|-------|--------|
| `firebase-basics` | CLI install & login, project creation/selection, app config downloads |
| `firebase-auth-basics` | Authentication — sign-in, user management, sessions |
| `firebase-firestore` | Cloud Firestore databases, data modeling, indexes, SDKs |
| `firestore-rules-creation` | Authoring and hardening `firestore.rules` |
| `firebase-security-rules-auditor` | Auditing Firestore and Cloud Storage rules for vulnerabilities |
| `firebase-data-connect` | Firebase Data Connect (SQL Connect) with PostgreSQL |
| `firebase-hosting-basics` | Classic Hosting — static sites, SPAs, custom domains |
| `firebase-app-hosting-basics` | App Hosting for SSR apps (Next.js, Angular) |
| `firebase-ai-logic-basics` | Firebase AI Logic (Gemini API) in web apps |
| `firebase-crashlytics` | Crashlytics provisioning and SDK usage |
| `firebase-remote-config-basics` | Remote Config templates, feature flags, SDKs |
| `extension-to-functions-codebase` | Converting a Firebase Extension into Cloud Functions |
| `xcode-project-setup` | Adding Swift Packages and linking files in `.pbxproj` |

## Installation

```sh
claude
/plugin marketplace add pleaseai/claude-code-plugins
/plugin install firebase@pleaseai
```

## Maintenance

The skills are vendored with [skills.sh](https://skills.sh) and tracked in `skills-lock.json`. Do not edit them by hand — fix upstream, then refresh:

```sh
cd plugins/firebase && bunx skills update
```

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase CLI reference](https://firebase.google.com/docs/cli)
- [Upstream skill source](https://github.com/firebase/agent-skills)
