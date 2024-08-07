"use strict";
import * as vscode from "vscode";
import path from "path";
import { exec } from "child_process";
import * as commonFunctions from "./commonFunctions";
import * as logFunctions from "./logFunctions";
import os from 'os';
import fs from 'fs';

var diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('QB64PE-lint')

/**
 * Runs the compiler/linter then calls lintCurrentFile with the output.
 */
export function runLint() {
	const outputChannel: any = logFunctions.getChannel(logFunctions.channelType.lint);

	try {
		if (!vscode.window.activeTextEditor) {
			logFunctions.writeLine("Cannot find activeTextEditor", outputChannel);
			return;
		}

		const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("qb64pe");
		let compilerPath: string = config.get("compilerPath");

		if (!compilerPath) {
			logFunctions.writeLine("The QB64PE compiler path is not set.", outputChannel);
			return;
		}

		/*
		if (os.platform() == "win32") {
			compilerPath = path.join(compilerPath, "qb64pe.exe");
		} else {
			compilerPath = path.join(compilerPath, "qb64pe");
		}
		*/

		compilerPath = compilerPath.replaceAll("\\", "/");

		let sourceCode = vscode.window.activeTextEditor.document.fileName;
		let baseFilename = path.dirname(sourceCode) + "/" + path.basename(sourceCode);
		let binaryName = baseFilename;

		if (os.platform() == "win32") {
			binaryName = binaryName + '.exe';
		} else {
			binaryName = binaryName + '.bin';
		}

		const command = `${compilerPath} -c "${sourceCode}" -o "${binaryName}" -x -w `;
		outputChannel.clear();
		if (config.get("isShowLintChannelEnabled")) {
			outputChannel.show(true)
		}

		if (!fs.existsSync(binaryName)) {
			logFunctions.writeLine(`File: ${binaryName} Not Found`, outputChannel);
			return;
		}

		logFunctions.writeLine(`Running: ${command}`, outputChannel);

		exec(command, (error, stdout, stderr) => {
			if (error) {
				logFunctions.writeLine(error.message, outputChannel);
			}
			if (stderr) {
				logFunctions.writeLine(stderr, outputChannel);
			}
			if (stdout) {
				logFunctions.writeLine(`${stdout}\n`, outputChannel);
				lintCurrentFile(stdout);
				logFunctions.writeLine(`Delete file ${binaryName}`, outputChannel);
				if (sourceCode != binaryName) {
					deleteFile(binaryName, outputChannel);
				}
			} else {
				logFunctions.writeLine("No stdout from qb64pe.exe found", outputChannel);
			}
		});

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
 * @returns void
 */
function lintCurrentFile(compilerOutput: string) {
	const outputChannel: any = logFunctions.getChannel(logFunctions.channelType.lint);
	const lintSource = "QB64PE-lint"

	try {
		let document: vscode.TextDocument = vscode.window.activeTextEditor.document;
		if (!document) {
			outputChannel.appendLine("Unable to find document");
			return;
		}
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

	} catch (error) {
		logFunctions.writeLine(`ERROR: ${error}`, outputChannel);
	}
}