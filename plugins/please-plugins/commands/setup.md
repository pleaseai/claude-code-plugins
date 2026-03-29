---
description: Scan project dependencies and install recommended Claude Code plugins
allowed-tools: Read, Bash, AskUserQuestion
---

# Plugin Recommender Setup

Scan the current project's dependencies and tooling files to detect packages that have corresponding Claude Code plugins in the `pleaseai` marketplace, then help the user install them.

## Step 1: Scan Dependencies

Run the dependency scanner script to detect matching plugins:

```bash
bun run "${CLAUDE_PLUGIN_ROOT}/hooks/check-dependencies.ts" --setup
```

Parse the JSON output. The script returns:

```json
{
  "detected": [
    { "pluginName": "nuxt-ui", "source": "@nuxt/ui" },
    { "pluginName": "turborepo", "source": "turbo.json" }
  ],
  "installed": ["vitest"]
}
```

- `detected`: Plugins that are available but not yet installed, with the source package or file that triggered the match.
- `installed`: Plugin names that are already installed.

If the script exits with a non-zero code, inform the user of the error and stop.

## Step 2: Show Results

If `detected` is empty and `installed` is empty: inform the user "No matching plugins found for this project's dependencies."

If `detected` is empty and `installed` is not empty: inform the user "All recommended plugins are already installed!"

Otherwise, present the scan results:

```
AskUserQuestion({
  questions: [{
    header: "Plugins",
    question: "Detected packages and their plugin status:\n\n{for each installed plugin: ✅ {pluginName}}\n{for each detected plugin: ⬜ {pluginName} — {source}}\n\nSelect plugins to install:",
    multiSelect: true,
    options: [
      // Only list detected (not-installed) plugins as selectable options
      { label: "{pluginName}", description: "Detected: {source}" },
      ...
    ]
  }]
})
```

## Step 3: Install Selected Plugins

For each selected plugin, run the install command:

```bash
claude plugin install {pluginName}@pleaseai
```

Show the result of each installation.

## Step 4: Summary

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
