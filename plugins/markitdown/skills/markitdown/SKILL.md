---
name: markitdown
description: Convert documents to Markdown using MarkItDown MCP tools. Use when the user wants to convert PDF, read PPTX, extract text from DOCX, convert document to markdown, or mentions .pdf/.docx/.pptx/.xlsx/.xls/.ppt/.doc files for reading or conversion. Triggers on phrases like "convert to markdown", "read this document", "extract text from", "parse this file" with binary document formats.
allowed-tools: mcp__markitdown__*
---

# MarkItDown - Document to Markdown Conversion

Use `mcp__markitdown__convert_to_markdown` whenever the user needs to read or extract text from binary document formats that Claude's native Read tool cannot parse.

## What MarkItDown Does

MarkItDown converts binary and structured document formats into clean, readable Markdown text. It preserves document structure including headings, tables, lists, and other formatting elements.

**Supported formats:**
- **Office documents**: DOCX, PPTX, XLSX, DOC, PPT, XLS
- **PDF**: PDF files (though Claude's Read tool also handles PDFs natively)
- **Images**: PNG, JPG, JPEG, GIF, BMP, TIFF (extracts text via OCR when available)
- **Web formats**: HTML, HTM
- **Data formats**: CSV, JSON, XML
- **Archives**: ZIP (extracts and converts contents)
- **Audio**: MP3, WAV (transcribes audio when possible)
- **eBooks**: EPUB

## When to Use MarkItDown

Use the markitdown MCP tool when:

1. **The file is a binary Office format**: `.docx`, `.pptx`, `.xlsx`, `.doc`, `.ppt`, `.xls` — Claude's Read tool returns garbled binary data for these formats. MarkItDown is the only reliable way to extract their text content.

2. **The user wants structured extraction**: When the user needs to preserve table structure, slide content, spreadsheet data, or document formatting in a machine-readable form.

3. **Processing multiple documents in a ZIP**: When a ZIP archive contains documents that need to be converted together.

4. **The user explicitly asks to "convert to markdown"**: Regardless of file type, honor this intent by using MarkItDown.

## When NOT to Use MarkItDown

Do NOT use MarkItDown for:

- **Plain text files** (`.txt`, `.md`, `.csv`, `.json`, `.xml`, `.html`): Use Claude's native Read tool — it handles these perfectly and is faster.
- **Source code files** (`.py`, `.js`, `.ts`, `.java`, etc.): Use the Read tool directly.
- **PDF files when only basic reading is needed**: Claude's Read tool natively supports PDF. Only use MarkItDown for PDFs when you need specific Markdown formatting or when the PDF is complex.
- **Images when the user wants visual analysis**: Use Claude's native image understanding instead of OCR-only text extraction.

## How to Use

### Basic document conversion

Call `mcp__markitdown__convert_to_markdown` with a `file://` URI:

```
mcp__markitdown__convert_to_markdown(uri="file:///absolute/path/to/document.docx")
```

The tool accepts `http:`, `https:`, `file:`, or `data:` URIs. For local files, always use the `file://` scheme with an absolute path (`file:///path/to/file`). The tool returns the document content as a Markdown string. Use this output directly to answer the user's question or to further process the content.

### Workflow for binary documents

When the user asks to read, summarize, or analyze a `.docx`, `.pptx`, or `.xlsx` file:

1. Construct a `file://` URI from the absolute path (e.g. `file:///home/user/report.docx`)
2. Call `mcp__markitdown__convert_to_markdown` with the `uri` argument
3. Read the returned Markdown content
4. Answer the user's question based on the extracted content

Do not attempt to use the Read tool on these binary formats first — it will return unreadable binary data and waste time.

### Handling PPTX (PowerPoint) files

PowerPoint files convert to Markdown with each slide's content. Slide titles become headings, bullet points become list items, and tables are preserved. Speaker notes may also be included.

### Handling XLSX (Excel) files

Excel spreadsheets convert with each sheet's data rendered as Markdown tables. Multiple sheets are separated with sheet name headings.

### Handling DOCX (Word) files

Word documents convert with full structure: headings, paragraphs, tables, and lists are all preserved in Markdown format.

## Important Notes

- **Always use `file://` URIs with absolute paths**: Construct the URI as `file:///absolute/path/to/file`. Relative paths are not supported — resolve to absolute first if needed.
- **The MCP server uses `uvx markitdown-mcp`**: It requires `uv` to be installed on the system. If the tool fails, check that `uv` is available.
- **Large files**: Very large documents (hundreds of pages) may take longer to convert. This is expected behavior.
- **Password-protected files**: MarkItDown cannot open password-protected Office documents or encrypted PDFs without the password.
