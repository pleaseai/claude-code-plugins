---
description: Generate and manipulate images with Nano Banana using natural language prompts.
---

Please use the plugin:nanobanana:nanobanana MCP server tools to help with image generation and manipulation tasks based on the user's natural language request.

Analyze the user request and determine the most appropriate tool:

- For single/multiple image generation: use generate_image tool
- For editing existing images: use edit_image tool
- For restoring/enhancing images: use restore_image tool
- For app icons, favicons, UI elements: use generate_icon tool
- For seamless patterns, textures, backgrounds: use generate_pattern tool
- For visual stories, sequences, tutorials: use generate_story tool
- For technical diagrams, flowcharts, architecture: use generate_diagram tool

Be intelligent about interpreting the user's intent from their natural language description and select the most specialized tool available.

User request: $ARGUMENTS
