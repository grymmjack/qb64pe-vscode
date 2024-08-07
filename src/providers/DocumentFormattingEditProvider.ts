"use strict";
import * as vscode from "vscode";
import * as logFunctions from "../logFunctions";
import { TokenInfo } from "../TokenInfo";

// Code Formatter
// Seems like a good place to find includes and make the double click to open work.
export class DocumentFormattingEditProvider implements vscode.DocumentFormattingEditProvider {
	outputChannel: any = logFunctions.getChannel(logFunctions.channelType.formatter);
	//regexOperators = /\s+,|\(|\)|\+|-|=|<|>|\[|\]|\/|{|}|`|;|:|\*|:\s+/g;

	/**
	 * Add spaces around the operators
	 * @param code Code Snippet
	 * @returns 
	 */
	private addOperatorSpaces(code: string): string {
		//const matches = code.matchAll(/\s+,|\(|\)|\+|-|=|<|>|\[|\]|\/|{|}|`|;|:|\*|:\s+/g);
		const matches = code.matchAll(/(?<!")\s+,|\(|\)|\+|-|=|<|>|\[|\]|\/|{|}|`|;|:|\*|:\s+(?!")/g)
		if (matches) {
			for (const match of matches) {
				code = code.replaceAll(match[0], ` ${match[0]} `);
			}
		}
		return code;
	}

	/**
	 * Is the line of code a single line if
	 * @param lowerLine 
	 * @returns 
	 */
	private isSingleLineIf(lowerLine: string): boolean {

		if (!lowerLine.startsWith("if") || lowerLine.replace("\r", "").endsWith("then")) {
			return false
		}

		//const work = lowerLine.substring(lowerLine.indexOf("'", lowerLine.indexOf("then")));
		//if (lowerLine.match(/then\s*'/i)) {
		//	return false;
		//}

		if (lowerLine.match(/^IF\s+.*(\s+THEN\s+.*|\s+ELSE\s+.*|)?$/i)) {
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Should the line be indented
	 * @param lowerLine 
	 * @returns 
	 */
	private shouldIndentLine(lowerLine: string): boolean {
		lowerLine = lowerLine.replace(/\d+/g, "").trim();
		return lowerLine.startsWith("if ")
			|| lowerLine.startsWith("if(")
			|| lowerLine.startsWith("sub ")
			|| lowerLine.startsWith("function ")
			|| lowerLine == "do"
			|| (lowerLine.startsWith("do ") && lowerLine.indexOf("loop") < 1)
			|| (lowerLine.startsWith("for ") && lowerLine.indexOf("next") < 1)
			|| (lowerLine.startsWith("while") && lowerLine.indexOf("wend") < 1)
			|| lowerLine.startsWith("type ")
			|| lowerLine.startsWith("select ")
			|| lowerLine.startsWith("declare dynamic library")
			|| lowerLine.startsWith("declare library")
	}

	/**
	 * Should the line be indent be removed
	 * @param lowerLine 
	 * @returns 
	 */
	private shouldRemoveLineIndent(lowerLine: string) {
		lowerLine = lowerLine.replace(/\d+/g, "").trim();
		return lowerLine == "loop" || lowerLine.startsWith("loop ") || lowerLine.startsWith("end if") || lowerLine == "endif" || lowerLine.startsWith("end sub") || lowerLine == "endsub" || lowerLine.startsWith("end function") || lowerLine == "endfunction" || lowerLine == "next" || lowerLine == "wend" || lowerLine == "end type" || lowerLine == "endtype" || lowerLine == "end select" || lowerLine == "endselect" || lowerLine == "next" || lowerLine.startsWith("next ") || lowerLine.startsWith("end declare") || lowerLine.startsWith("enddeclare");
	}

	/**
	 * Should this line of code get processed.
	 * @param lowerLine 
	 * @returns 
	 */
	private shouldProcessLine(lowerLine: string) {
		return !(lowerLine.startsWith("rem") || lowerLine.startsWith("'"));
	}

	/**
	 * Format all the elements in the array.
	 * @param words 
	 * @param tokenCache 
	 */
	private formatArray(words: string[], tokenCache: Map<string, TokenInfo>) {
		for (let index = 0; index < words.length; index++) {
			words[index] = words[index].trim();
			if (words[index].length < 1 || words[index].trim().toLowerCase().startsWith("rem") || words[index].trim().startsWith("'")) {
				continue;
			}
			if (index > 0) {
				words[index] = this.formatWord(words[index], words[index - 1], tokenCache);
			} else {
				words[index] = this.formatWord(words[index], "", tokenCache);
			}

		}
	}

	private cleanUpCode(code: string): string {

		code = code
			.replaceAll(/(?<!")\s*-\s*/g, "-")
			.replaceAll(/(?<!")\s*:\s*/g, " : ")
			.replaceAll(/(?<!")\s*;\s*/g, ";")
			.replaceAll(/(?<!")\s*,\s*/g, ",")
			.replaceAll(",", ", ")
			.replaceAll(/\s*\(\s*/g, "(")
			.replaceAll(/\s*\)\s*/g, ") ").replaceAll(") ,", "),")
			.replaceAll(/\s*\)\s*\)/g, "))")
			.replaceAll(/\s*\)\)\s*\)/g, ")))")
			.replaceAll(/=/g, " = ")
			.replaceAll(/\*/g, " * ")
			.replaceAll(/<\s*\=/g, " <= ")
			.replaceAll(/>\s*\=/g, " >= ")
			.replaceAll(/>\s*\=/g, " >= ")
			.replaceAll(/\s*<\s*>/g, " <> ")
			.replaceAll(/\s*\.\s*/g, ".")
			.replaceAll(/'\.\/\s*/g, "'./")
			.replace(/(?<=[A-Za-z])\s\./i, ".")
			.replaceAll(/\+/g, " + ")
			.replace(/^put\(/i, `${new TokenInfo("put").WordFormatted} (`)
			.replace(/^if\(/i, `${new TokenInfo("if").WordFormatted} (`)
			.replaceAll(/(\sand\()/gi, ` ${new TokenInfo("and").WordFormatted} (`)
			.replaceAll(/(\sor\()/gi, ` ${new TokenInfo("or").WordFormatted} (`)
			.replace(/(?<!")-(?=[A-Za-z]|\d\))/i, " - ").replace(/(?<=[A-Za-z]|\))-/i, " - ")
			.replace("delay.", "delay .") // major hack
			.replaceAll(",.", ", .")
			.replaceAll("=.", "= .")
			.replaceAll(">-", "> -")
			.replaceAll("<-", "< -")
			.replace(" step - ", "  step -")
			.replaceAll(/\s\s+/g, " ")
			.trim();

		if (code.toLowerCase().endsWith(" :")) {
			code = code.replace(" :", ":");
		}

		if (code.toLowerCase().startsWith("defint")) {
			code = code.replace(/\s*-\s*/, '-');
		} else if (code.toLowerCase().startsWith("rest.")) {
			code = code.replace(".", " .")
		} else if (code.toLowerCase().startsWith("$resize")
			|| code.toLowerCase().startsWith("$versioninfo")
			|| code.toLowerCase().startsWith("$exeicon")
			|| code.toLowerCase().startsWith("$color")
			|| code.toLowerCase().startsWith("$checking")) {
			if (code.toLowerCase().indexOf("legalcopyright") > 0 || code.toLowerCase().indexOf("companyname") > 0 || code.toLowerCase().indexOf("filedescription") > 0 || code.toLowerCase().indexOf("comments") > 0) {
				code = code.replace(/\s*:\s*/, ':');
				code = code.replace(/\s*=\s*/, '=');
			} else {
				code = code.replaceAll(/\s*/g, "");
			}
		}

		if (!code.toLocaleLowerCase().startsWith("data")) {
			code = code.replaceAll(/(?<=[0-9])-/g, " - ") // This should be moved to cleanUpCode
		} else {
			if (code.toLocaleLowerCase().startsWith("data-")) {
				code = code.replace("data-", "data -");
			}
		}

		// Powershell Stuff
		code = code
			.replaceAll(/get\s*-\s*item/ig, "Get-Item")
			.replaceAll(/pwsh\s*-\s*command/ig, "pwsh -command")
			.replaceAll("@ { name = ", "@{name=")
			.replaceAll("hh : mm : ss", "hh:mm:ss")
			.replaceAll("HH : mm : ss", "HH:mm:ss")
			.replaceAll("'MM / dd / yyyy hh : mm : ss tt'", "'MM/dd/yyyy hh:mm:ss tt'")
			.replace("Get - ChildItem-force-path '", "Get-ChildItem -force -path '")

		return code.trim();
	}

	async provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): Promise<vscode.TextEdit[]> {
		let retvalue: vscode.TextEdit[] = [];

		if (document.lineCount > 2000) {
			if (await vscode.window.showInformationMessage('Do you want to start the long running process?', 'Yes', 'No') !== 'Yes') {
				return null;
			}
		}

		// const operators = ",(+-=<>[{}]`);:.";
		const qb64Config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("qb64pe");
		const vscodeConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("editor")
		const indent = vscodeConfig.get("insertSpaces") ? " ".repeat(vscodeConfig.get("tabSize")) : "\t"

		try {

			if (!qb64Config.get("isFormatEnabled")) {
				return null;
			}

			let tokenCache = new Map<string, TokenInfo>();
			let level: number = 0;
			let inCase: boolean = false;
			let inDeclare: boolean = false;

			for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber++) {

				// logFunctions.writeLine(`Line Number: ${lineNumber}`, this.outputChannel);

				if (token.isCancellationRequested) {
					return null;
				}

				const originalLine: vscode.TextLine = document.lineAt(lineNumber);
				let newLine = originalLine.text.trim().replaceAll(" && ", " and ").replaceAll(" || ", "  or ").replaceAll(" != ", " <> ").replaceAll(" == ", " = ");
				let lowerLine = newLine.toLowerCase();
				const isSingleLineIf: boolean = this.isSingleLineIf(newLine.toLowerCase());

				if (!isSingleLineIf) {
					if (lowerLine == "endif") {
						newLine = "end if";
						lowerLine = newLine.toLowerCase();
					} else if (lowerLine == "endsub") {
						newLine = "end sub";
						lowerLine = newLine.toLowerCase();
					} else if (lowerLine == "endfunction") {
						newLine = "end function";
						lowerLine = newLine.toLowerCase();
					} else if (lowerLine == "endtype") {
						newLine = "end type";
						lowerLine = newLine.toLowerCase();
					} else if (lowerLine == "endselect") {
						newLine = "end select";
						lowerLine = newLine.toLowerCase();
					} else if (newLine.startsWith("? ")) {
						newLine = newLine.replace("? ", "print ");
						lowerLine = newLine.toLowerCase();
					} else if (lowerLine.startsWith("if ") && lowerLine.indexOf(" then") < 0) {
						newLine = `${newLine} then`
						lowerLine = newLine.toLowerCase();
					} else if (lowerLine.startsWith("elseif ") && lowerLine.indexOf(" then") < 0) {
						newLine = `${newLine} then`
						lowerLine = newLine.toLowerCase();
					}

					if (inDeclare && (lowerLine.startsWith("function") || lowerLine.startsWith("sub"))) {
					} else if (this.shouldIndentLine(lowerLine)) {
						level++;
						if (lowerLine.startsWith("declare dynamic library") || (lowerLine.startsWith("declare library"))) {
							inDeclare = true;
						}
					} else if (this.shouldRemoveLineIndent(lowerLine)) {
						level--;
						if (lowerLine.startsWith("end declare") || lowerLine.startsWith("enddeclare")) {
							inDeclare = false;
						}
					} else if (lowerLine.startsWith("case ") && !inCase) {
						inCase = true;
						level++;
					}

					if (lowerLine.startsWith("end select") || lowerLine.startsWith("endselect")) {
						if (inCase) {
							inCase = false;
							level--
						}
					}
				}

				if (this.shouldProcessLine(lowerLine)) {
					if (newLine.endsWith(";") && lowerLine.indexOf("print") < 0) {
						do {
							newLine = newLine.substring(0, newLine.length - 1).trimEnd();
						} while (newLine.endsWith(";"))
					}

					// newLine = newLine.replaceAll(/\s+,|\(|\)|\+|-|=|<|>|\[|\]|{|}|`|;|\*|:\s+/g, " $1 ");
					// This just puts $1 in the code not the match WTF 😒

					// let matches = lineOfCode.matchAll(/(?<=rgb|rgb32)(\()[ 0-9]+(,[ 0-9]+)+(,[ 0-9]+)+(\))/ig);

					if (lowerLine.indexOf('"') > -1 && !lowerLine.match(/(?<='|rem)"/i)) {
						const start: number = newLine.indexOf('"') - 1;
						let words: string[] = this.addOperatorSpaces(newLine.substring(0, start)).split(" ");
						this.formatArray(words, tokenCache);
						const work = this.cleanUpCode(words.join(" "));
						newLine = work + newLine.substring(start);
					} else {

						newLine = this.addOperatorSpaces(newLine);
						//}

						let words: string[] = newLine.split(" ");
						this.formatArray(words, tokenCache);
						newLine = this.cleanUpCode(words.join(" "));
					}

					newLine = newLine.trim();

					if (lineNumber > 0 && document.lineAt(lineNumber - 1).text.trim().endsWith("_")) {
						newLine = `${indent}${newLine}`;
					}
				}

				if (level > 0) {
					let indentAmount: number = level;
					if (!isSingleLineIf && (this.shouldIndentLine(lowerLine) || lowerLine.startsWith("case ") || lowerLine.startsWith("else"))) {
						if (!inDeclare || (inDeclare && lowerLine.startsWith("declare"))) {
							indentAmount = level - 1;
						}
					}
					if (indentAmount > 0) {
						newLine = `${indent.repeat(indentAmount)}${newLine}`;
					}
				}

				if (newLine !== originalLine.text) {
					retvalue.push(vscode.TextEdit.replace(originalLine.range, newLine));
				}
			}

		} catch (error) {
			logFunctions.writeLine(`ERROR in provideDocumentFormattingEdits: ${error}`, this.outputChannel);
		}
		return retvalue;
	}

	private formatWord(word: string, previousWord: string, tokenCache: Map<string, TokenInfo>): string {
		// TODO: Break the following code out to a function so strings can be handled.

		if (word != ")" && (word != "(") && (word != "+") && (word != "-") && (word != "*") && (word != "=") && word != ":" && (word != ";")) {
			let tokenInfo: TokenInfo = null;
			if (tokenCache.has(word.toLowerCase())) {
				tokenInfo = tokenCache.get(word.toLowerCase());
			} else {
				tokenInfo = new TokenInfo(word, "", this.outputChannel);
				if (previousWord.toLowerCase() == "const") {
					let spot: number = tokenInfo.WordFormatted.lastIndexOf(".")
					if (spot > 1) {
						let firstPart: string = tokenInfo.WordFormatted.substring(0, spot).toLowerCase()
						firstPart = this.camelCaseWordTrailing(firstPart, "Type")
						firstPart = this.camelCaseWordTrailing(firstPart, "Status")
						firstPart = this.camelCaseWordTrailing(firstPart, "Code")
						firstPart = this.camelCaseWordTrailing(firstPart, "Integration")
						firstPart = this.camelCaseWordTrailing(firstPart, "Error")
						firstPart = this.camelCaseWordTrailing(firstPart, "State")
						tokenInfo.WordFormatted = firstPart + "." + tokenInfo.WordFormatted.substring(spot + 1).toUpperCase()
					}
					else {
						tokenInfo.WordFormatted = tokenInfo.WordFormatted.toUpperCase();
					}
				}
				tokenCache.set(word.toLocaleLowerCase(), tokenInfo);
			}

			if (tokenInfo) {
				return tokenInfo.WordFormatted;
			} else {
				logFunctions.writeLine(`Unable to find ${word}`, this.outputChannel)
			}
		}
		return word;
	}

	private camelCaseWordTrailing(base: string, word: string): string {
		let retvalue: string = base.replaceAll(new RegExp(`${word}`, "gi"), word);
		retvalue = `${retvalue.substring(0, 1).toLocaleLowerCase() + retvalue.substring(1)}`
		return retvalue;
	}

}