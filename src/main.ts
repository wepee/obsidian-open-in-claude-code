import { Plugin, Notice, addIcon } from "obsidian";
import { exec } from "child_process";
import * as path from "path";
import * as fs from "fs/promises";

const CLAUDE_ICON = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0.5,11) scale(1.5)"><rect x="0" y="13" width="6" height="13" fill="currentColor"/><rect x="60" y="13" width="6" height="13" fill="currentColor"/><rect x="6" y="39" width="6" height="13" fill="currentColor"/><rect x="18" y="39" width="6" height="13" fill="currentColor"/><rect x="42" y="39" width="6" height="13" fill="currentColor"/><rect x="54" y="39" width="6" height="13" fill="currentColor"/><rect x="6" width="54" height="39" fill="currentColor"/><rect x="12" y="13" width="6" height="6.5" fill="var(--background-primary, black)"/><rect x="48" y="13" width="6" height="6.5" fill="var(--background-primary, black)"/></g></svg>`;

export default class OpenInClaudeCode extends Plugin {
	onload(): void {
		addIcon("claude", CLAUDE_ICON);

		this.addRibbonIcon("claude", "Open in Claude code", () => {
			void this.openInDirectory();
		});

		this.addCommand({
			id: "open-dir",
			name: "Open current directory in Claude code",
			callback: () => void this.openInDirectory(),
		});

		this.addCommand({
			id: "open-vault-root",
			name: "Open vault root in Claude code",
			callback: () => void this.openInVaultRoot(),
		});
	}

	private getVaultPath(): string {
		return (this.app.vault.adapter as { basePath: string }).basePath;
	}

	private async openInDirectory(): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		let dir: string;

		if (activeFile) {
			const vaultPath = this.getVaultPath();
			const filePath = path.join(vaultPath, activeFile.path);
			dir = path.dirname(filePath);
		} else {
			dir = this.getVaultPath();
		}

		await this.ensurePlugins(dir);
		this.launchClaude(dir);
	}

	private async openInVaultRoot(): Promise<void> {
		const vaultPath = this.getVaultPath();
		await this.ensurePlugins(vaultPath);
		this.launchClaude(vaultPath);
	}

	private async getRootPlugins(): Promise<Record<string, boolean> | null> {
		const rootSettingsPath = path.join(this.getVaultPath(), ".claude", "settings.json");
		try {
			const raw = await fs.readFile(rootSettingsPath, "utf-8");
			const parsed = JSON.parse(raw);
			const plugins = parsed?.enabledPlugins;
			if (plugins && Object.keys(plugins).length > 0) {
				return plugins;
			}
		} catch {
			// no root settings
		}
		return null;
	}

	private async ensurePlugins(dir: string): Promise<boolean> {
		const vaultPath = this.getVaultPath();
		if (dir === vaultPath) return false;

		const rootPlugins = await this.getRootPlugins();
		if (!rootPlugins) return false;

		const settingsPath = path.join(dir, ".claude", "settings.json");

		let parsed: Record<string, unknown> = {};
		try {
			const raw = await fs.readFile(settingsPath, "utf-8");
			parsed = JSON.parse(raw);
		} catch {
			// file doesn't exist or is malformed — we'll create it
		}

		const current = (parsed.enabledPlugins ?? {}) as Record<string, boolean>;
		const needsUpdate = Object.entries(rootPlugins).some(
			([key, value]) => current[key] !== value,
		);

		if (!needsUpdate) return false;

		parsed.enabledPlugins = { ...current, ...rootPlugins };
		await fs.mkdir(path.join(dir, ".claude"), { recursive: true });
		await fs.writeFile(settingsPath, JSON.stringify(parsed, null, 2));
		return true;
	}

	private launchClaude(dir: string): void {
		const escaped = dir.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
		const script =
			'tell application "Terminal"\n' +
			'do script "cd \\"' + escaped + '\\" && claude"\n' +
			"activate\n" +
			"end tell";

		exec(
			`osascript -e '${script.replace(/'/g, "'\\''")}'`,
			(err) => {
				if (err) {
					new Notice("Failed to open Claude Code: " + err.message);
				} else {
					new Notice("Opening Claude Code in: " + dir);
				}
			},
		);
	}
}
