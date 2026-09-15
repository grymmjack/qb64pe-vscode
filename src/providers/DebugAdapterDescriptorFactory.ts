import * as vscode from "vscode";
import * as debugadapter from "@vscode/debugadapter";

var ownTerminal: vscode.Terminal;
export class DebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
	createDebugAdapterDescriptor(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
		if (!session.configuration.hasOwnProperty("command")) {
			vscode.window.showErrorMessage(`No command found for QB64PE launch configuration "${session.configuration.name}". Add one like "command": "echo Hello" to your launch.json.`);
		} else {
			const terminal = this.getTerminal(session.configuration);
			if (!session.configuration.hasOwnProperty("showTerminal") || session.configuration.showTerminal) {
				terminal.show();
			}
			terminal.sendText(String(session.configuration.command));
		}
		return new vscode.DebugAdapterInlineImplementation(new DummyDebugSession());
	}

	getTerminal(configuration: vscode.DebugConfiguration): vscode.Terminal {
		if (
			configuration.hasOwnProperty("terminalIndex") && Number.isInteger(configuration.terminalIndex) &&
			configuration.terminalIndex >= 0 && configuration.terminalIndex < vscode.window.terminals.length
		) {
			return vscode.window.terminals[configuration.terminalIndex];
		}

		if (!ownTerminal || ownTerminal.exitStatus) {
			let name = "QB64PE";
			if (configuration.hasOwnProperty("terminalName")) {
				name = String(configuration.terminalName);
			}
			ownTerminal = vscode.window.createTerminal(name);
		}
		return ownTerminal;
	}
}

export class DummyDebugSession extends debugadapter.DebugSession {
	protected initializeRequest(): void {
		this.sendEvent(new debugadapter.TerminatedEvent());
	}
}


/**
 * Supplies a default "build & run the current file" configuration so pressing
 * F5 on a QB64PE file works without a launch.json. VS Code calls this with an
 * empty config when none is defined; we fill in the compile-and-run command.
 */
export class QB64PEDebugConfigurationProvider
	implements vscode.DebugConfigurationProvider {
	resolveDebugConfiguration(
		_folder: vscode.WorkspaceFolder | undefined,
		config: vscode.DebugConfiguration
	): vscode.ProviderResult<vscode.DebugConfiguration> {
		if (!config.type && !config.request && !config.name) {
			const editor = vscode.window.activeTextEditor;
			if (!editor || editor.document.languageId !== "QB64PE") {
				return undefined; // nothing to run
			}
			config.type = "QB64PE";
			config.request = "launch";
			config.name = "QB64PE: Build & Run";
		}
		if (!config.command) {
			config.command =
				"${config:qb64pe.compilerPath} -c ${file} -o ${fileDirname}/${fileBasenameNoExtension}.exe -x; ${fileDirname}/${fileBasenameNoExtension}.exe";
		}
		return config;
	}
}
