# Claude Code Plugin Marketplace

A Nuxt 4 + Nuxt UI 4 application for browsing and installing Claude Code plugins.

## Features

- 🎨 **Modern UI**: Built with Nuxt UI 4 components
- 🔍 **Real-time Search**: Filter plugins by name, description, or repository
- 🌓 **Dark Mode**: Automatic dark/light theme support
- 📱 **Responsive**: Works on all device sizes
- 📦 **Data-Driven**: Powered by Nuxt Content with JSON data source
- 📋 **One-Click Install**: Copy installation commands to clipboard

## Project Structure

```text
apps/web/
├── app/
│   ├── components/
│   │   ├── PluginCard.vue         # Individual plugin card component
│   │   └── PluginSearch.vue       # Search and filter component
│   ├── pages/
│   │   └── index.vue               # Main marketplace page
│   └── app.vue                     # Root app component
├── content/                        # (Placeholder for content)
├── public/                         # Static assets
├── app.config.ts                   # Nuxt UI theme configuration
├── content.config.ts               # Nuxt Content collection schema
├── nuxt.config.ts                  # Nuxt configuration
└── package.json
```

## Tech Stack

- **Nuxt 4**: Latest Nuxt framework
- **Nuxt UI 4**: Component library with Tailwind CSS v4
- **Nuxt Content**: JSON data collections
- **TypeScript**: Type safety
- **Vue 3**: Composition API

## Getting Started

### Prerequisites

- Node.js 22+
- bun

### Installation

```bash
cd apps/web
bun install
```

### Development

```bash
bun run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### Build

```bash
bun run build
```

### Preview Production Build

```bash
bun run preview
```

## Data Source

The marketplace reads plugin data from `../../.claude-plugin/marketplace.json`, which contains:

- Plugin name and description
- GitHub repository information
- Version numbers
- Marketplace owner details

### Marketplace JSON Schema

```json
{
  "name": "marketplace-name",
  "version": "1.0.0",
  "description": "Marketplace description",
  "owner": {
    "name": "Owner Name",
    "email": "owner@example.com"
  },
  "plugins": [
    {
      "name": "plugin-name",
      "description": "Plugin description",
      "version": "1.0.0",
      "source": {
        "source": "github",
        "repo": "owner/repo"
      }
    }
  ]
}
```

## Components

### PluginCard

Displays individual plugin information with:
- Plugin name and version badge
- Description
- GitHub repository link
- Copy install command button

### PluginSearch

Provides search functionality with:
- Real-time filtering
- Live plugin count
- Clear search button

## Configuration

### Theme Customization

Edit `app.config.ts` to customize Nuxt UI theme:

```typescript
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'slate'
    }
  }
})
```

### Content Collections

The plugin data schema is defined in `content.config.ts` using Zod validation.

## Features in Detail

### Search & Filter

- Real-time search across plugin names, descriptions, and repositories
- Case-insensitive matching
- Live count of filtered results

### One-Click Installation

Each plugin card includes a "Copy Install" button that copies the installation command:

```bash
claude-code plugins install https://github.com/owner/repo
```

### Responsive Grid Layout

- 1 column on mobile
- 2 columns on tablet
- 3 columns on desktop

## License

Part of the claude-code-plugins monorepo
