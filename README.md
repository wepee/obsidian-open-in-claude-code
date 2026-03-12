# Open in Claude Code

An [Obsidian](https://obsidian.md) plugin that launches [Claude Code](https://docs.anthropic.com/en/docs/claude-code) in the directory of the current note or at the vault root.

## Features

- **Ribbon icon** — Click the Claude icon in the left sidebar to open Claude Code in the active note's directory.
- **Command palette** — Two commands available:
  - *Open current directory in Claude Code* — Opens the parent directory of the active note.
  - *Open vault root in Claude Code* — Opens the vault root directory.
- **Auto-sync plugins** — Before each launch, the plugin ensures that the target directory inherits all `enabledPlugins` from the vault root's `.claude/settings.json`. If the directory doesn't have its own `.claude/settings.json`, one is created automatically.

## Requirements

- macOS (uses AppleScript to launch Terminal)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed and available in your `PATH`

## Installation

### From community plugins

1. Open **Settings → Community plugins → Browse**.
2. Search for **Open in Claude Code**.
3. Click **Install**, then **Enable**.

### Manual

1. Download `main.js` and `manifest.json` from the [latest release](https://github.com/wepee/open-in-claude-code/releases/latest).
2. Create a folder `open-in-claude-code` inside your vault's `.obsidian/plugins/` directory.
3. Copy both files into that folder.
4. Reload Obsidian and enable the plugin in **Settings → Community plugins**.

## Development

```bash
git clone https://github.com/wepee/open-in-claude-code.git
cd open-in-claude-code
npm install
npm run dev
```

Copy or symlink the built `main.js` and `manifest.json` into your vault's `.obsidian/plugins/open-in-claude-code/` folder.
