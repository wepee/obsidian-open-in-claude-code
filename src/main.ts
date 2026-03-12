import { Plugin, Notice, addIcon } from "obsidian";
import { exec } from "child_process";
import * as path from "path";
import * as fs from "fs/promises";

const CLAUDE_ICON = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0.5,11) scale(1.5)"><rect x="0" y="13" width="6" height="13" fill="currentColor"/><rect x="60" y="13" width="6" height="13" fill="currentColor"/><rect x="6" y="39" width="6" height="13" fill="currentColor"/><rect x="18" y="39" width="6" height="13" fill="currentColor"/><rect x="42" y="39" width="6" height="13" fill="currentColor"/><rect x="54" y="39" width="6" height="13" fill="currentColor"/><rect x="6" width="54" height="39" fill="currentColor"/><rect x="12" y="13" width="6" height="6.5" fill="var(--background-primary, black)"/><rect x="48" y="13" width="6" height="6.5" fill="var(--background-primary, black)"/></g></svg>`;

const SKIP_DIRS = new Set(["node_modules", ".obsidian", ".trash", ".git"]);

export default class OpenInClaudeCode extends Plugin {
	async onload(): Promise<void> {
		addIcon("claude", CLAUDE_ICON);

		this.addRibbonIcon("claude", "Open in Claude Code", () => {
			this.openInDirectory();
		});

		this.addCommand({
			id: "open-dir",
			name: "Open current directory in Claude Code",
			callback: () => this.openInDirectory(),
		});

		this.addCommand({
			id: "open-vault-root",
			name: "Open vault root in Claude Code",
			callback: () => this.openInVaultRoot(),
		});

		this.addCommand({
			id: "sync-plugins",
			name: "Sync Claude Code plugins across vault",
			callback: async () => {
				const count = await this.syncEnabledPlugins();
				new Notice(
					count > 0
						? `Synced Claude plugins to ${count} subdirectories`
						: "All subdirectories already in sync",
				);
			},
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

		await this.syncEnabledPlugins();
		this.launchClaude(dir);
	}

	private async openInVaultRoot(): Promise<void> {
		await this.syncEnabledPlugins();
		this.launchClaude(this.getVaultPath());
	}

	private async syncEnabledPlugins(): Promise<number> {
		const vaultPath = this.getVaultPath();
		const rootSettingsPath = path.join(vaultPath, ".claude", "settings.json");

		let rootPlugins: Record<string, boolean>;
		try {
			const raw = await fs.readFile(rootSettingsPath, "utf-8");
			const parsed = JSON.parse(raw);
			rootPlugins = parsed?.enabledPlugins;
		} catch {
			return 0;
		}

		if (!rootPlugins || Object.keys(rootPlugins).length === 0) {
			return 0;
		}

		const childSettingsPaths = await this.findChildClaudeSettings(
			vaultPath,
			rootSettingsPath,
		);

		let updatedCount = 0;

		for (const settingsPath of childSettingsPaths) {
			try {
				const raw = await fs.readFile(settingsPath, "utf-8");
				const parsed = JSON.parse(raw);
				const current = parsed.enabledPlugins ?? {};

				const needsUpdate = Object.entries(rootPlugins).some(
					([key, value]) => current[key] !== value,
				);

				if (needsUpdate) {
					parsed.enabledPlugins = { ...current, ...rootPlugins };
					await fs.writeFile(
						settingsPath,
						JSON.stringify(parsed, null, 2),
					);
					updatedCount++;
				}
			} catch {
				console.warn(
					`Open in Claude Code: skipping malformed ${settingsPath}`,
				);
			}
		}

		return updatedCount;
	}

	private async findChildClaudeSettings(
		dir: string,
		rootSettingsPath: string,
	): Promise<string[]> {
		const results: string[] = [];

		let entries;
		try {
			entries = await fs.readdir(dir, { withFileTypes: true });
		} catch {
			return results;
		}

		for (const entry of entries) {
			if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) {
				continue;
			}

			const fullPath = path.join(dir, entry.name);

			if (entry.name === ".claude") {
				const settingsPath = path.join(fullPath, "settings.json");
				if (settingsPath !== rootSettingsPath) {
					try {
						await fs.access(settingsPath);
						results.push(settingsPath);
					} catch {
						// no settings.json here
					}
				}
			} else {
				const children = await this.findChildClaudeSettings(
					fullPath,
					rootSettingsPath,
				);
				results.push(...children);
			}
		}

		return results;
	}

	private launchClaude(dir: string): void {
		const escaped = dir.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
		const script =
			'tell application "Terminal"\n' +
			"activate\n" +
			'do script "cd \\"' + escaped + '\\" && claude"\n' +
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
