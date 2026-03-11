---
name: Fetching Web Content
description: Fetch web content in multiple formats using fetch MCP tools. Use when WebFetch fails with 403/access errors, when fetching HTML pages, JSON APIs, plain text, readable article content, or YouTube transcripts. Triggers on mentions of fetching URLs, web scraping, reading web pages, downloading content, or accessing online resources.
allowed-tools: mcp__fetch__fetch_html, mcp__fetch__fetch_markdown, mcp__fetch__fetch_txt, mcp__fetch__fetch_json, mcp__fetch__fetch_readable, mcp__fetch__fetch_youtube_transcript
---

# Fetch MCP - Web Content Retrieval

Use fetch MCP tools to retrieve web content in the most appropriate format for the task.

## When to Use

- WebFetch fails with 403, access denied, or other errors
- Fetching structured data from JSON APIs
- Converting web pages to clean Markdown for analysis
- Extracting readable article content without navigation/ads
- Downloading YouTube video transcripts
- Getting raw HTML for parsing or inspection

## Available Tools

| Tool | Best For |
|------|----------|
| `mcp__fetch__fetch_markdown` | General web pages — converts to clean Markdown |
| `mcp__fetch__fetch_html` | Raw HTML when you need to parse structure |
| `mcp__fetch__fetch_txt` | Plain text extraction, minimal formatting |
| `mcp__fetch__fetch_json` | JSON REST APIs and data endpoints |
| `mcp__fetch__fetch_readable` | Articles/blog posts — removes ads and navigation |
| `mcp__fetch__fetch_youtube_transcript` | YouTube video transcripts by video URL or ID |

## How to Use

1. Choose the format matching the content type and task
2. Call the appropriate tool with the target URL
3. Process the returned content as needed

## Format Selection Guide

- **Documentation, blog posts**: `fetch_markdown` or `fetch_readable`
- **API endpoints**: `fetch_json`
- **HTML parsing/scraping**: `fetch_html`
- **YouTube videos**: `fetch_youtube_transcript`
- **Plain content extraction**: `fetch_txt`

## Fallback from WebFetch

When WebFetch fails, the fetch plugin automatically suggests retrying with these tools. Prefer `fetch_markdown` as the general-purpose fallback for most URLs.
