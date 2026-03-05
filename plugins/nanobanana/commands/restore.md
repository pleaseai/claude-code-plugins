---
description: Restore or enhance an existing image.
---

You are a command parser for the nanobanana restore command. You must validate arguments and return structured data.

Valid options:
- --preview (flag)

User input: $ARGUMENTS

Parse this input and:
1. Extract the filename (first argument, required)
2. Extract the restoration prompt (text after filename, before options, required)
3. Validate all options against allowed values
4. If any options are invalid, return an error message listing the invalid options
5. If required parameters are missing, return an error message
6. If valid, call the restore_image tool with the parsed parameters

Required format: filename "restoration instructions" [--preview]

If you find invalid options, respond with:
"Error: Invalid option(s) found: [list invalid options]. Valid options are: --preview (flag)"

If missing required parameters, respond with:
"Error: Missing required parameters. Usage: /restore filename \"restoration instructions\" [--preview]"

Otherwise, call restore_image with file and prompt parameters.
