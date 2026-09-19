import * as vscode from "vscode";
import * as debugadapter from "@vscode/debugadapter";
import { QB64DebugSession } from "./QB64DebugSession";
import { WorkspaceSymbolIndex } from "./WorkspaceSymbolIndex";

var ownTerminal: vscode.Terminal;

/**
 * Reveal the Run and Debug view and/or the Debug Console (each opt-in via
 * qb64pe.debug.focus*OnStart), immediately and fire-and-forget. Called from
 * resolveDebugConfiguration so the panes appear the moment F5 is pressed —
 * before compilation — giving live feedback while the build runs. Reveal the
 * view first and the console last so, when both are on, the console ends
 * focused. Both `.focus` commands also un-hide a collapsed pane.
 */
export function revealDebugPanes(): void {
	const cfg = vscode.workspace.getConfiguration("qb64pe");
	const wantView = cfg.get<boolean>("debug.focusRunDebugViewOnStart", true);
	const wantConsole = cfg.get<boolean>("debug.focusDebugConsoleOnStart", true);
	const run = (command: string) =>
		Promise.resolve(vscode.commands.executeCommand(command)).then(undefined, () => {
			/* command unavailable in this VS Code build — ignore */
		});
	if (wantView) {
		run("workbench.view.debug");
	}
	if (wantConsole) {
		run("workbench.debug.action.focusRepl");
		run("workbench.panel.repl.view.focus");
	}
}
export class DebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
	constructor(private readonly workspaceIndex?: WorkspaceSymbolIndex) {}

	createDebugAdapterDescriptor(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
		// Two flavors share the "QB64PE" debug type:
		//  - a `command` config runs a terminal build & run (the 0.11.1 launcher);
		//  - a `program` config (F5 "Start Debugging") drives the real vwatch
		//    debugger via QB64DebugSession.
		if (session.configuration.hasOwnProperty("command")) {
			const terminal = this.getTerminal(session.configuration);
			if (!session.configuration.hasOwnProperty("showTerminal") || session.configuration.showTerminal) {
				terminal.show();
			}
			terminal.sendText(String(session.configuration.command));
			return new vscode.DebugAdapterInlineImplementation(new DummyDebugSession());
		}

		if (this.workspaceIndex) {
			return new vscode.DebugAdapterInlineImplementation(
				new QB64DebugSession(this.workspaceIndex.index)
			);
		}

		vscode.window.showErrorMessage(
			`QB64PE debugger is not available (symbol index missing). Add a "command" to your launch configuration to build & run instead.`
		);
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
	/**
	 * Offered when VS Code asks what to run (F5 with no launch.json, or the
	 * "Add Configuration" list). Returning the debug config here means picking
	 * "QB64PE" starts the real debugger rather than the terminal build & run.
	 */
	provideDebugConfigurations(
		_folder: vscode.WorkspaceFolder | undefined
	): vscode.ProviderResult<vscode.DebugConfiguration[]> {
		return [
			{
				name: "QB64PE: Debug",
				type: "QB64PE",
				request: "launch",
				program: "${file}",
				stopOnEntry: false,
			},
		];
	}

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
			config.name = "QB64PE";
		}

		// Reveal the debug UI the instant F5 is pressed — this runs before the
		// adapter is created and long before QB64DebugSession.launchRequest
		// compiles, so the user sees the Debug Console (and its "Flattened…/
		// Compiling…" output) immediately instead of waiting out a stalled
		// compile. onDidStartDebugSession is too late: for QB64PE it fires only
		// after the compile completes. Fire-and-forget so config resolution isn't
		// blocked. Applies to both the debugger and terminal build & run paths.
		if (config.type === "QB64PE") {
			revealDebugPanes();
		}

		// "Run Without Debugging" (Ctrl+F5) and explicit `command` configs keep
		// the terminal build & run launcher. "Start Debugging" (F5) with no
		// command drives the vwatch debugger, so we give it a `program` instead.
		if (config.command) {
			return config;
		}
		if (config.noDebug) {
			config.command =
				"${config:qb64pe.compilerPath} -c ${file} -o ${fileDirname}/${fileBasenameNoExtension}.exe -x; ${fileDirname}/${fileBasenameNoExtension}.exe";
			return config;
		}
		if (!config.program) {
			config.program = "${file}";
		}
		return config;
	}
}
