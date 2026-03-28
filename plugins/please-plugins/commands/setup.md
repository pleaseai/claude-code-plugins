---
description: Scan project dependencies and install recommended Claude Code plugins
allowed-tools: Read, Bash, Glob, Grep, AskUserQuestion
---

# Plugin Recommender Setup

Scan the current project's `package.json` and tooling files to detect packages that have corresponding Claude Code plugins in the `pleaseai` marketplace, then help the user install them.

## Step 1: Scan Dependencies

Read `package.json` in the current working directory. If it doesn't exist, inform the user and stop.

Read the plugin mappings and tooling mappings from the plugin's data files:

```bash
cat "${CLAUDE_PLUGIN_ROOT}/hooks/plugin-mappings.json"
cat "${CLAUDE_PLUGIN_ROOT}/hooks/tooling-mappings.json"
```

Parse the project's `dependencies` and `devDependencies` to find matches against the plugin mappings. Also check for tooling indicators:
- Lock files: `pnpm-lock.yaml`, `turbo.json`
- `packageManager` field in `package.json`

## Step 2: Check Installed Plugins

Read `.claude/settings.json` (project-level) to check which plugins are already installed. Look for entries in `enabledPlugins` matching `<pluginName>@pleaseai`.

## Step 3: Show Results

Present the scan results to the user, categorized:

```
AskUserQuestion({
  questions: [{
    header: "Plugins",
    question: "Detected packages and their plugin status:\n\n{for each detected plugin: ✅ installed / ⬜ not installed — source package}\n\nSelect plugins to install:",
    multiSelect: true,
    options: [
      // Only list NOT-installed plugins as selectable options
      { label: "{pluginName}", description: "Detected: {source package or tooling indicator}" },
      ...
    ]
  }]
})
```

If all detected plugins are already installed, inform the user: "All recommended plugins are already installed!"

If no packages match any plugin mappings, inform the user: "No matching plugins found for this project's dependencies."

## Step 4: Install Selected Plugins

For each selected plugin, run the install command:

```bash
claude plugin install {pluginName}@pleaseai
```

Show the result of each installation.

## Step 5: Summary

Show a summary of what was installed:

```
Plugin Recommender Setup Complete!

Installed: {count} plugins
  - {pluginName1}
  - {pluginName2}

Already installed: {count} plugins
  - {pluginName3}

To manage plugins: /plugin list
```
