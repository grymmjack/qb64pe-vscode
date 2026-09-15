"use strict";
import * as vscode from "vscode";
import * as logFunctions from "../logFunctions";
import { QB64Symbol } from "../core/symbols";
import { WorkspaceSymbolIndex } from "./WorkspaceSymbolIndex";
import { isRoutine, resolveName } from "../core/queries";
import { identifierAt, scanLine, splitStatements } from "../core/lexer";
import { parameterLabel, signatureLabel } from "../core/format";

interface CallSite {
  name: string;
  parameterIndex: number;
  /** `Show a, b` rather than `Show(a, b)` - only SUBs can be called this way. */
  isStatement: boolean;
}

const NAME = /^[A-Za-z_][A-Za-z0-9_]*(?:~?(?:%%|&&|##|[%&!#`])|\$)?$/;
const NOT_A_CALL = new Set([
  "PRINT", "INPUT", "DIM", "REDIM", "STATIC", "COMMON", "CONST", "IF", "ELSEIF",
  "WHILE", "UNTIL", "FOR", "SELECT", "CASE", "LOCATE", "COLOR", "LINE", "CIRCLE",
  "PAINT", "PSET", "PRESET", "GET", "PUT", "OPEN", "CLOSE", "WRITE", "READ", "DATA",
  "SWAP", "ERASE", "SCREEN", "SOUND", "PLAY", "GOTO", "GOSUB", "RETURN", "LET",
  "SHARED", "DECLARE", "TYPE", "SUB", "FUNCTION", "END", "EXIT", "DO", "LOOP", "NEXT",
]);

export class SignatureHelpProvider implements vscode.SignatureHelpProvider {
  private readonly outputChannel = logFunctions.getChannel(
    logFunctions.channelType.signatureHelp
  );

  constructor(private readonly workspaceIndex: WorkspaceSymbolIndex) {}

  public async provideSignatureHelp(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.SignatureHelpContext
  ): Promise<vscode.SignatureHelp | null> {
    try {
      const textUpToCursor = document
        .lineAt(position.line)
        .text.substring(0, position.character);
      const call = this.findCallSite(textUpToCursor);
      if (!call) {
        return null;
      }

      this.workspaceIndex.ensureDocument(document);
      let candidates = resolveName(
        this.workspaceIndex.index,
        this.workspaceIndex.keyOf(document),
        position.line,
        call.name
      ).filter(isRoutine);
      if (call.isStatement) {
        candidates = candidates.filter((s) => s.type === "SUB");
      }
      if (candidates.length === 0) {
        return null;
      }

      const help = new vscode.SignatureHelp();
      help.signatures = candidates.map((s) => this.signatureOf(s));
      help.activeSignature = 0;
      help.activeParameter = Math.max(0, call.parameterIndex);
      return help;
    } catch (error) {
      logFunctions.writeLine(
        `Error in provideSignatureHelp: ${error}`,
        this.outputChannel
      );
      return null;
    }
  }

  /**
   * Finds the routine call the cursor is inside: the innermost unclosed
   * `name(` outside strings, or - failing that - a statement-style SUB call
   * `name arg, arg` on the current statement.
   */
  private findCallSite(text: string): CallSite | null {
    const scan = scanLine(text);
    if (scan.commentStart >= 0 && scan.commentStart < text.length) {
      return null;
    }

    // Parenthesised call: track open parens outside strings on the masked text.
    const open: number[] = [];
    const commas: number[][] = [];
    for (let i = 0; i < scan.mask.length; i++) {
      const c = scan.mask[i];
      if (c === "(") {
        open.push(i);
        commas.push([]);
      } else if (c === ")") {
        open.pop();
        commas.pop();
      } else if (c === "," && open.length > 0) {
        commas[commas.length - 1].push(i);
      }
    }
    if (open.length > 0) {
      const paren = open[open.length - 1];
      let j = paren - 1;
      while (j >= 0 && /\s/.test(scan.mask[j])) j--;
      const id = j >= 0 ? identifierAt(text, j, scan) : null;
      if (id && id.end === j + 1 && !NOT_A_CALL.has(id.word.toUpperCase())) {
        return {
          name: id.word,
          parameterIndex: commas[commas.length - 1].length,
          isStatement: false,
        };
      }
    }

    // Statement call: `Show a, b` on the last statement of the line.
    const statements = splitStatements(text, scan);
    const last = statements[statements.length - 1];
    if (!last) return null;
    const m = last.text.match(/^(?:CALL\s+)?(\S+)\s+([\s\S]*)$/i);
    if (!m || !NAME.test(m[1]) || NOT_A_CALL.has(m[1].toUpperCase())) {
      return null;
    }
    const args = scanLine(m[2]).mask;
    let depth = 0;
    let parameterIndex = 0;
    for (const c of args) {
      if (c === "(") depth++;
      else if (c === ")") depth--;
      else if (c === "," && depth === 0) parameterIndex++;
    }
    return { name: m[1], parameterIndex, isStatement: true };
  }

  private signatureOf(symbol: QB64Symbol): vscode.SignatureInformation {
    const parameters = symbol.parameters ?? [];
    const signature = new vscode.SignatureInformation(signatureLabel(symbol));

    const docParts: string[] = [];
    if (symbol.documentation) docParts.push(symbol.documentation);
    if (symbol.type === "FUNCTION" && symbol.dataType) {
      docParts.push(`**Returns** ${symbol.dataType}`);
    }
    if (docParts.length > 0) {
      signature.documentation = new vscode.MarkdownString(docParts.join("\n\n"));
    }

    signature.parameters = parameters.map((param) => {
      const info = new vscode.ParameterInformation(parameterLabel(param));
      if (param.description) {
        info.documentation = new vscode.MarkdownString(param.description);
      }
      return info;
    });
    return signature;
  }
}
