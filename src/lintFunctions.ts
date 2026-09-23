"use strict";
import * as vscode from "vscode";
import path from "path";
import { ChildProcess, exec } from "child_process";
import * as commonFunctions from "./commonFunctions";
import * as logFunctions from "./logFunctions";
import os from 'os';
import fs from 'fs';

var diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('QB64PE-lint')

/**
 * The "QB64PE: Lint" terminal: a pseudoterminal we own, so the compiler's live
 * output is shown to the user while we still capture it to build diagnostics.
 * Reused across runs; recreated if the user closes it.
 */
class LintTerminal {
	private readonly writeEmitter = new vscode.EventEmitter<string>();
	private terminal: vscode.Terminal | undefined;
	private opened = false;
	private pending = "";

	get exists(): boolean {
		return !!this.terminal;
	}

	show(): void {
		if (!this.terminal) {
			this.opened = false;
			const pty: vscode.Pseudoterminal = {
				onDidWrite: this.writeEmitter.event,
				open: () => {
					this.opened = true;
					if (this.pending) this.writeEmitter.fire(this.pending);
					this.pending = "";
				},
				close: () => { this.terminal = undefined; },
			};
			this.terminal = vscode.window.createTerminal({ name: "QB64PE: Lint", pty });
		}
		this.terminal.show(true);
	}

	/** Writes text (LF line endings are converted for the terminal). */
	write(text: string): void {
		if (!this.terminal) return;
		const data = text.replace(/\r?\n/g, "\r\n");
		if (this.opened) this.writeEmitter.fire(data);
		else this.pending += data;
	}

	clear(): void {
		this.write("\x1b[2J\x1b[3J\x1b[H");
	}
}

const lintTerminal = new LintTerminal();
let running: ChildProcess | undefined;

/**
 * Lints the active file with the QB64PE compiler (`-z` syntax check by default)
 * and turns its output into Problems. Run from the Lint command, the output
 * streams into the "QB64PE: Lint" terminal (shown when
 * qb64pe.isShowLintChannelEnabled); lint-on-save runs quietly and only writes
 * to that terminal if it is already open.
 */
export function runLint(fromCommand = true) {
	const outputChannel: any = logFunctions.getChannel(logFunctions.channelType.lint);

	try {
		const document = vscode.window.activeTextEditor?.document;
		if (!document) {
			if (fromCommand) vscode.window.showInformationMessage("Lint: open a QB64PE source file first.");
			return;
		}

		const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("qb64pe");
		let compilerPath: string = config.get("compilerPath");

		if (!compilerPath) {
			if (fromCommand) vscode.window.showWarningMessage("Lint: set qb64pe.compilerPath to your QB64PE compiler first.");
			return;
		}

		compilerPath = compilerPath.replaceAll("\\", "/");

		let sourceCode = document.fileName;
		let baseFilename = path.dirname(sourceCode) + "/" + path.basename(sourceCode);
		let binaryName = baseFilename;

		if (os.platform() == "win32") {
			binaryName = binaryName + '.exe';
		} else {
			binaryName = binaryName + '.bin';
		}

		// -z = translate-and-check only (no executable, C goes to internal/temp);
		// otherwise a full -c/-x compile to a throwaway binary. -w is opt-in.
		const syntaxCheckOnly: boolean = config.get("isLintSyntaxCheckOnly", true);
		const showWarnings: boolean = config.get("isLintShowCompilerWarnings");

		// Trade-off: `-z` is fast (skips the g++ link) but won't catch linker-stage
		// errors; the full compile is slower but complete. Both still print the same
		// "LINE n:" / warning output that lintCurrentFile() parses. The `-w` (warnings)
		// axis is orthogonal to the mode, so compose it on afterward.
		let command: string = syntaxCheckOnly
			? `${compilerPath} -z "${sourceCode}"`
			: `${compilerPath} -c "${sourceCode}" -o "${binaryName}" -x`;
		if (showWarnings) {
			command += " -w";
		}

		// A newer lint supersedes one still running (e.g. rapid saves).
		running?.kill();
		running = undefined;

		if (fromCommand && config.get("isShowLintChannelEnabled", true)) {
			lintTerminal.show();
		}
		lintTerminal.clear();

		// The binary pre-check only makes sense for the full compile; -z never emits one.
		if (!syntaxCheckOnly && !fs.existsSync(binaryName)) {
			lintTerminal.write(`File: ${binaryName} Not Found\n`);
			return;
		}

		lintTerminal.write(`\x1b[1;36m$ ${command}\x1b[0m\n\n`);

		const child = exec(command, { maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
			if (running === child) running = undefined;
			if (child.killed) return;
			if (error && !stdout && !stderr) {
				lintTerminal.write(`${error.message}\n`);
			}
			if (stdout) {
				// The compiler colors its output (ANSI escapes), which the parser
				// can't see through; the terminal above shows it colored.
				const problems = lintCurrentFile(stdout.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, ""), document);
				lintTerminal.write(problems > 0
					? `\n\x1b[1;31m${problems} problem(s) found — see the Problems panel.\x1b[0m\n`
					: `\n\x1b[1;32mNo problems found.\x1b[0m\n`);
				// -z leaves no executable to clean up.
				if (!syntaxCheckOnly && sourceCode != binaryName) {
					deleteFile(binaryName, outputChannel);
				}
			} else {
				lintTerminal.write("No output from the QB64PE compiler.\n");
			}
		});
		running = child;
		child.stdout?.on("data", (chunk) => lintTerminal.write(String(chunk)));
		child.stderr?.on("data", (chunk) => lintTerminal.write(String(chunk)));

	} catch (error) {
		logFunctions.writeLine(`ERROR in runLint: ${error}`, outputChannel);
	}
}

/**
 * Deletes a file see (https://stackoverflow.com/questions/5315138/node-js-remove-file)
 * @param fileName {string} File to delete
 * @returns void
 */
function deleteFile(fileName: string, outputChannel: any) {
	const { unlink } = require('fs/promises');
	(async function (path) {
		try {
			if (fs.existsSync(path)) {
				await unlink(path);
				logFunctions.writeLine(`File ${path} Deleted`, outputChannel)
			}
		} catch (error) {
			logFunctions.writeLine(`ERROR in deleteFile: ${error.message}`, outputChannel)
		}
	})(fileName);
}

/**
 * Decorates the code file with output from the compiler
 * @param compilerOutput The contents of the compiler output.
 * @param document The document that was linted.
 * @returns The number of diagnostics published.
 */
function lintCurrentFile(compilerOutput: string, document: vscode.TextDocument): number {
	const outputChannel: any = logFunctions.getChannel(logFunctions.channelType.lint);
	const lintSource = "QB64PE-lint"

	try {
		let sourceCode: string[] = document.getText().split('\n')

		diagnosticCollection.set(document.uri, []);
		diagnosticCollection.clear();

		let diagnostics: vscode.Diagnostic[] = [];

		let lines = compilerOutput.split("\n")
		let errorLineNumber: number = -1;
		for (let lineIndex = 3; lineIndex < lines.length; lineIndex++) {
			const lintLine = lines[lineIndex];
			if (!lintLine || lintLine.startsWith("[")) {
				continue;
			}

			errorLineNumber = -1;
			if (lintLine.startsWith("Illegal ")
				|| lintLine.startsWith("DIM: ")
				|| lintLine.startsWith("Cannot ")
				|| lintLine.startsWith("Undefine ")
				|| lintLine.startsWith("Undefined ")
				|| lintLine.startsWith("Expected")
				|| lintLine.startsWith("File ")
				|| lintLine.startsWith("Syntax ")
				|| lintLine.startsWith("RETURN ")
				|| lintLine.startsWith("Type ")
				|| lintLine.startsWith("Name ")
				|| lintLine.startsWith("Unexpected ")
				|| lintLine.startsWith("Invalid expression")
				|| lintLine.startsWith("Element not defined")
				|| lintLine.startsWith("Unknown ")
				|| lintLine.startsWith("Missing ")
				|| lintLine.startsWith("_DEFINE: ")
				|| lintLine.startsWith("Command ")
				|| lintLine.startsWith("2nd sub argument")
				|| lintLine.startsWith("Cannot ")
				|| lintLine.startsWith("Invalid ")
				|| lintLine.startsWith("Variable ")
				|| lintLine.startsWith("Array")
				|| lintLine.startsWith("THEN ")
				|| lintLine.startsWith("Incorrect ")
				|| lintLine.startsWith("1st ")
				|| lintLine.startsWith("String ")
				|| lintLine.startsWith("END IF ")
				|| lintLine.startsWith("Statement ")
				|| lintLine.startsWith("Label '")
				|| lintLine.startsWith("User defined types")
				|| lintLine.startsWith("IF without END IF")
				|| lintLine.startsWith("SUB ")
				|| lintLine.startsWith("TYPE ")
				|| lintLine.startsWith("Only ")
				|| lintLine.startsWith("Number required for function")
				|| lintLine.startsWith("CVL ")
				|| lintLine.startsWith("Expected IF expression THEN/GOTO")
			) {
				let code: string = "";
				for (let x = lineIndex; x < lines.length; x++) {
					const element = lines[x];
					if (element.startsWith("LINE ")) {
						const work: string[] = element.split(":")
						if (work.length > 0) {
							code = commonFunctions.escapeRegExp(work[1].replace("\r", "")).trim();
							if (!code || code.length < 1) {
								code = lintLine;
							}
						}
						errorLineNumber = Number(work[0].split(" ").pop()) - 1;
						break;
					}
				}

				if (code.length < 1 || errorLineNumber < 0) {
					continue;
				}

				let diagnostic: vscode.Diagnostic
				const match = sourceCode[errorLineNumber].match(new RegExp("(" + commonFunctions.escapeRegExp(code) + ")", "i"));
				const message = lintLine.replace("\r", "") + "\n" + lines[lineIndex + 1].replace("\r", "");
				if (match) {
					diagnostic = new vscode.Diagnostic(commonFunctions.createRange(match, errorLineNumber), message);
				} else {
					diagnostic = new vscode.Diagnostic(new vscode.Range(new vscode.Position(errorLineNumber, 0), new vscode.Position(errorLineNumber, 9999)), message);
				}
				diagnostic.severity = vscode.DiagnosticSeverity.Error;
				diagnostic.code = 102;
				diagnostic.source = lintSource;
				diagnostics.push(diagnostic)
			} else if (lintLine.indexOf("warning") >= 0) {

				const tokens: string[] = lintLine.split(":");

				if (path.basename(document.uri.fsPath) != tokens[0]) {
					// Somehow highlight the file in the explorer view and maybe the include statement that goes with it.
					continue;
				}
				errorLineNumber = Number(tokens[1]) - 1;
				let diagnostic: vscode.Diagnostic = new vscode.Diagnostic(
					new vscode.Range(new vscode.Position(errorLineNumber, 0), new vscode.Position(errorLineNumber, sourceCode[errorLineNumber].length),),
					tokens[3].replace("\r", ""),
					vscode.DiagnosticSeverity.Warning,
				);
				diagnostic.source = lintSource;
				diagnostic.code = 502;
				diagnostics.push(diagnostic)
			}
		}

		if (diagnostics.length > 0) {
			diagnosticCollection.set(document.uri, diagnostics);
		}
		return diagnostics.length;

	} catch (error) {
		logFunctions.writeLine(`ERROR: ${error}`, outputChannel);
		return 0;
	}
}