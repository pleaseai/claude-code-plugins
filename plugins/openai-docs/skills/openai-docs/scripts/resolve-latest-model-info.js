#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");
const { fileURLToPath } = require("node:url");

const DEFAULT_URL =
  "https://developers.openai.com/api/docs/guides/latest-model.md";
const DEFAULT_BASE_URL = "https://developers.openai.com";

function parseArgs(argv) {
  const args = {
    source: process.env.LATEST_MODEL_URL || DEFAULT_URL,
    baseUrl: process.env.LATEST_MODEL_BASE_URL || DEFAULT_BASE_URL,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--source" || arg === "--url") {
      if (i + 1 >= argv.length) {
        throw new Error(`missing value for option ${arg}`);
      }
      args.source = argv[i + 1];
      i += 1;
    } else if (arg === "--base-url") {
      if (i + 1 >= argv.length) {
        throw new Error(`missing value for option ${arg}`);
      }
      args.baseUrl = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

async function readSource(source) {
  if (!/^https?:\/\//.test(source)) {
    // Local read. `source` is CLI/env-controlled, so resolve both plain paths
    // and `file://` URLs to a real filesystem path and confine it to the
    // current working directory before reading (guards path traversal — a
    // `file://` URL must not escape the guard the way a plain path cannot).
    const localPath = source.startsWith("file://")
      ? fileURLToPath(source)
      : source;
    const allowedBase = path.resolve(process.cwd());
    const resolved = path.resolve(allowedBase, localPath);
    if (resolved !== allowedBase && !resolved.startsWith(allowedBase + path.sep)) {
      throw new Error(`refusing to read outside ${allowedBase}: ${resolved}`);
    }
    return fs.readFile(resolved, "utf8");
  }

  const response = await fetch(source, {
    headers: { accept: "text/markdown,text/plain,*/*" },
  });

  if (!response.ok) {
    throw new Error(`failed to fetch ${source}: ${response.status}`);
  }

  return response.text();
}

function parseIndentedInfo(lines, startIndex) {
  const info = {};

  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) {
      continue;
    }

    const match = line.match(/^ {2}([A-Za-z][A-Za-z0-9_-]*):\s*(.+?)\s*$/);
    if (!match) {
      break;
    }

    info[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }

  return info;
}

function parseFlatInfo(block) {
  const info = {};

  for (const line of block.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z][A-Za-z0-9_-]*):\s*(.+?)\s*$/);
    if (match) {
      info[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }

  return info;
}

function extractLatestModelInfo(markdown) {
  const lines = markdown.split(/\r?\n/);
  const latestModelInfoIndex = lines.findIndex((line) =>
    /^latestModelInfo:\s*$/.test(line)
  );

  if (latestModelInfoIndex >= 0) {
    return parseIndentedInfo(lines, latestModelInfoIndex);
  }

  const commentMatch = markdown.match(
    /<!--\s*latestModelInfo\s*\n([\s\S]*?)\n\s*-->/m
  );
  if (commentMatch) {
    return parseFlatInfo(commentMatch[1]);
  }

  return undefined;
}

function modelToSkillSlug(model) {
  return model.trim().replace(/\./g, "p");
}

function absoluteUrl(baseUrl, value) {
  return new URL(value, baseUrl).toString();
}

function normalizeInfo(info, baseUrl) {
  const model = info?.model?.trim();
  const migrationGuide = info?.migrationGuide?.trim();
  const promptingGuide = info?.promptingGuide?.trim();

  if (!model || !migrationGuide || !promptingGuide) {
    throw new Error(
      "latestModelInfo must include model, migrationGuide, and promptingGuide"
    );
  }

  return {
    model,
    modelSlug: modelToSkillSlug(model),
    migrationGuideUrl: absoluteUrl(baseUrl, migrationGuide),
    promptingGuideUrl: absoluteUrl(baseUrl, promptingGuide),
  };
}

async function main() {
  const { source, baseUrl } = parseArgs(process.argv);
  const markdown = await readSource(source);
  const info = extractLatestModelInfo(markdown);

  if (!info) {
    throw new Error(`latestModelInfo block not found in ${source}`);
  }

  process.stdout.write(
    `${JSON.stringify(normalizeInfo(info, baseUrl), null, 2)}\n`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
