import { Plugin, Notice, addIcon } from "obsidian";
import { exec } from "child_process";
import * as path from "path";

const CLAUDE_ICON = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0.5,11) scale(1.5)"><rect x="0" y="13" width="6" height="13" fill="currentColor"/><rect x="60" y="13" width="6" height="13" fill="currentColor"/><rect x="6" y="39" width="6" height="13" fill="currentColor"/><rect x="18" y="39" width="6" height="13" fill="currentColor"/><rect x="42" y="39" width="6" height="13" fill="currentColor"/><rect x="54" y="39" width="6" height="13" fill="currentColor"/><rect x="6" width="54" height="39" fill="currentColor"/><rect x="12" y="13" width="6" height="6.5" fill="var(--background-primary, black)"/><rect x="48" y="13" width="6" height="6.5" fill="var(--background-primary, black)"/></g></svg>`;

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
	}

	private getVaultPath(): string {
		return (this.app.vault.adapter as { basePath: string }).basePath;
	}

	private openInDirectory(): void {
		const activeFile = this.app.workspace.getActiveFile();
		let dir: string;

		if (activeFile) {
			const vaultPath = this.getVaultPath();
			const filePath = path.join(vaultPath, activeFile.path);
			dir = path.dirname(filePath);
		} else {
			dir = this.getVaultPath();
		}

		this.launchClaude(dir);
	}

	private openInVaultRoot(): void {
		this.launchClaude(this.getVaultPath());
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
