---
name: Analyzing Code with SonarQube CLI
description: Run SonarQube CLI to detect code quality issues, scan for hardcoded secrets, and manage SonarQube/SonarCloud projects. Use when the user mentions SonarQube, SonarCloud, code quality issues, secret scanning, SAST, static analysis, hardcoded credentials, or wants to query issues by severity or branch. Triggers on mentions of sonar, sonarqube, sonarcloud, secret detection, code smells, security hotspots, or quality gates.
allowed-tools: Bash, Read
---

# SonarQube CLI - Code Quality & Secret Scanning

Use the `sonar` CLI to scan for secrets, query SonarQube/SonarCloud issues, and manage projects.

## When to Use

- Scanning files or prompts for hardcoded secrets, API keys, or credentials
- Querying SonarQube/SonarCloud for code quality issues by project, severity, or branch
- Listing and searching SonarQube projects
- Setting up Claude Code hooks for automatic secret detection
- Checking authentication status or logging in to SonarQube/SonarCloud

## Prerequisites

The `sonar` CLI must be installed. If not found in PATH, inform the user:

```sh
curl -fsSL https://sonar.io/install | bash
```

Do not run the installation command automatically. Let the user decide.

If `sonar` returns an authentication error, inform the user to run `sonar auth login`.

## CLI Quick Reference

### Secret Scanning

```sh
# Scan files for hardcoded secrets
sonar analyze secrets

# Scan a specific file or directory
sonar analyze secrets --path src/

# Scan text content (e.g., a prompt or config string)
sonar analyze secrets --text "some content to scan"
```

### Issue Management

```sh
# List issues for a project
sonar list issues --project my-project-key

# Filter by severity
sonar list issues --project my-project-key --severity CRITICAL

# Filter by branch
sonar list issues --project my-project-key --branch main

# Filter by type (BUG, VULNERABILITY, CODE_SMELL, SECURITY_HOTSPOT)
sonar list issues --project my-project-key --type VULNERABILITY
```

### Project Management

```sh
# List all accessible projects
sonar list projects

# Search projects by name
sonar list projects --search "my-app"
```

### Authentication

```sh
# Log in to SonarQube or SonarCloud
sonar auth login

# Check authentication status
sonar auth status
```

### Claude Code Integration

```sh
# Install hooks for automatic secret detection in Claude Code
sonar integrate claude
```

## Workflow

### Secret Scanning Workflow

1. Run `sonar analyze secrets` on the target path or content
2. Review detected secrets (type, file, line number)
3. Report findings to the user with file locations
4. Suggest remediation: remove secrets, use environment variables or a secrets manager

### Issue Query Workflow

1. Run `sonar list projects` if the project key is unknown
2. Run `sonar list issues --project <key>` with appropriate filters
3. Parse results and present issues sorted by severity (BLOCKER > CRITICAL > MAJOR > MINOR > INFO)
4. For each issue, report: rule, message, file, line, severity
5. Offer to investigate or fix specific issues using Edit tool

## Notes

- Set `SONAR_TOKEN` environment variable for non-interactive authentication
- Set `SONAR_HOST_URL` for self-hosted SonarQube (defaults to SonarCloud)
- Secret scanning works offline; issue queries require network access to SonarQube/SonarCloud
