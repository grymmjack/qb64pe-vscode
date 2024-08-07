"use strict";
import * as vscode from "vscode";
import * as commonFunctions from "../commonFunctions";
import * as logFunctions from "../logFunctions";
import { TokenInfo } from "../TokenInfo";
import * as fs from "fs";

export class DefinitionProvider implements vscode.DefinitionProvider {
	regexIncludeFile = /include:(.*)'/i
	outputChannel = logFunctions.getChannel(logFunctions.channelType.definitionProvider);
	config: vscode.WorkspaceConfiguration = null;

	constructor(config?: vscode.WorkspaceConfiguration) {
		if (config) {
			this.config = config;
		} else {
			this.config = vscode.workspace.getConfiguration("qb64pe");
		}
	}

	public async provideDefinition(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken
	): Promise<vscode.Location[]> {
		const path = require('path');
		try {
			if (!document || !vscode.window.activeTextEditor) {
				return null;
			}

			let selectedText = commonFunctions.getSelectedTextOrLineTest();
			let match = selectedText.match(this.regexIncludeFile)

			if (match !== null && match.index !== undefined) {
				let file = match[1].replace("'", "").replaceAll("\\", "/");
				let fullPath = commonFunctions.getAbsolutePath(path.dirname(vscode.window.activeTextEditor.document.fileName).replaceAll("\\", "/",) + "/", file);
				if (fs.existsSync(fullPath)) {
					return new Promise<vscode.Location[]>((resolve) => {
						let range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));
						return resolve([new vscode.Location(vscode.Uri.file(fullPath), range)]);
					});
				} else {
					this.outputChannel.appendLine("File " + fullPath + " not found.");
					return null;
				}
			}

			match = selectedText.match(/\$ExeIcon:'([^']*)'/);
			if (match) {
				let fullPath = commonFunctions.getAbsolutePath(path.dirname(vscode.window.activeTextEditor.document.fileName).replaceAll("\\", "/",) + "/", match[1]);
				if (fs.existsSync(fullPath)) {
					this.outputChannel.appendLine("File " + fullPath + " found.");
					return new Promise<vscode.Location[]>((resolve) => {
						let range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));
						return resolve([new vscode.Location(vscode.Uri.file(fullPath), range)]);
					});
				}
				this.outputChannel.appendLine("File " + fullPath + " not found.");
				return null;
			}

			const word = commonFunctions.getQB64WordFromDocument(document, position);
			if (word.length < 1) {
				return null;
			}
			const searchResults = await this.doSearch(word, document, token);
			if (searchResults && searchResults.length > 0) {
				logFunctions.writeLine(`searchResults (${searchResults.length}): ${searchResults[0].uri}`, this.outputChannel);
				return new Promise<vscode.Location[]>((resolve) => { resolve(searchResults); });
			} else {
				logFunctions.writeLine(`Open Help for: ${word} - not found in search`, this.outputChannel);
				if (this.config.get("isClickKeywordHelpFileEnabled")) {
					new TokenInfo(word, "", this.outputChannel).showHelp();
				} else {
					logFunctions.writeLine(`Open Help for: ${word} - not found in search and isClickKeywordHelpFileEnabled = false`, this.outputChannel);
				}
				return null;
			}
		} catch (error) {
			this.outputChannel.appendLine("ERROR in DefinitionProvider: " + error);
		}
		return null;
	}

	/**
	 * Recursive function to find definition in Include files.
	 */
	private doSearch(word: string, document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.Location[]> {

		return new Promise<vscode.Location[]>(async (resolve) => {
			try {
				let includedFiles: string[] = []
				const sourceLines = document.getText().split("\n");

				for (let lineNumber = 0; lineNumber < sourceLines.length; lineNumber++) {
					if (token.isCancellationRequested) {
						return resolve(null);
					}

					if (document == vscode.window.activeTextEditor.document && lineNumber == vscode.window.activeTextEditor.selection.active.line) {
						continue;
					}

					const line = sourceLines[lineNumber].toLowerCase().replace("\r", "").toLowerCase().trim();

					if (line.match(this.regexIncludeFile)) {
						includedFiles.push(line);
						continue;
					}

					logFunctions.writeLine(line, this.outputChannel)
					if (!(line.startsWith("sub") || line.startsWith("dim") || line.startsWith("function") || line.startsWith("type") || line.startsWith("const") || line.startsWith(`${word.toLowerCase()}:`))) {
						continue;
					}

					let match = line.match(new RegExp(`\\W${commonFunctions.escapeRegExp(word)}\\W`, "i"));
					if (match) {
						return resolve([new vscode.Location(vscode.Uri.file(document.fileName), commonFunctions.createRange(match, lineNumber))]);
					}

					match = line.match(new RegExp(`\\b${commonFunctions.escapeRegExp(word)}\\b`, "i"));
					if (match) {
						return resolve([new vscode.Location(vscode.Uri.file(document.fileName), commonFunctions.createRange(match, lineNumber))]);
					}

				}

				for (let fileIndex = 0; fileIndex < includedFiles.length; fileIndex++) {
					try {
						let selectedText: string = includedFiles[fileIndex];
						let match = selectedText.match(this.regexIncludeFile)
						if (match) {
							const path = require('path');
							const fullPath = commonFunctions.getAbsolutePath(path.dirname(document.fileName).replaceAll("\\", "/",) + "/", match[1].replace("'", "").replaceAll("\\", "/"));
							if (fs.existsSync(fullPath)) {
								logFunctions.writeLine(`Looking for ${word} in ${fullPath}`, this.outputChannel);
								let includeFileDocument = await vscode.workspace.openTextDocument(fullPath); // Change to use then
								let searchResults: vscode.Location[] = await this.doSearch(word, includeFileDocument, token);
								if (searchResults) {
									logFunctions.writeLine(`Found ${word} in ${fullPath}`, this.outputChannel)
									vscode.window.showTextDocument(includeFileDocument).then(() => {
										let range = searchResults[0].range;
										logFunctions.writeLine(`Open ${fullPath} at line ${searchResults[0].range.start.line + 1}`, this.outputChannel);
										vscode.window.activeTextEditor.selection = new vscode.Selection(range.start, range.end);
										vscode.window.activeTextEditor.revealRange(range);
									});
									return resolve(searchResults);
								}
							} else {
								logFunctions.writeLine("File " + fullPath + " not found.", this.outputChannel);
							}
						}
					} catch (error) {
						logFunctions.writeLine("ERROR in doSearch: " + error, this.outputChannel);
					}
				}
			} catch (error) {
				logFunctions.writeLine(`ERROR in doSearch: ${error}`, this.outputChannel)
			} finally {
				return resolve(null);
			}
		});
	}
}
