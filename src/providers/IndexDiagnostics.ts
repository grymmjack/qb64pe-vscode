"use strict";
import * as vscode from "vscode";
import * as logFunctions from "../logFunctions";
import { WorkspaceSymbolIndex } from "./WorkspaceSymbolIndex";
import { Diagnostic, diagnose } from "../core/diagnostics";
import { toVsRange } from "./convert";

const SETTING = "isIndexDiagnosticsEnabled";
const DEBOUNCE_MS = 300;

/**
 * Publishes the index-driven diagnostics (see core/diagnostics.ts) for open
 * QB64PE documents into their own "QB64PE-index" collection, separate from
 * the compiler lint. Live as you type (debounced); on by default via
 * qb64pe.isIndexDiagnosticsEnabled.
 */
export class IndexDiagnostics implements vscode.Disposable {
  private readonly collection = vscode.languages.createDiagnosticCollection("QB64PE-index");
  private readonly disposables: vscode.Disposable[] = [];
  private readonly outputChannel = logFunctions.getChannel(logFunctions.channelType.lint);
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly workspaceIndex: WorkspaceSymbolIndex) {
    this.disposables.push(
      this.collection,
      workspaceIndex.onDidChange(() => this.schedule()),
      vscode.workspace.onDidOpenTextDocument(() => this.schedule()),
      // Live linting: re-check as the user types (debounced), not just on save.
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.languageId === "QB64PE") this.schedule();
      }),
      vscode.workspace.onDidCloseTextDocument((d) => this.collection.delete(d.uri)),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration(`qb64pe.${SETTING}`)) this.refresh();
      })
    );
    workspaceIndex.whenReady().then(() => this.refresh());
  }

  private enabled(): boolean {
    return vscode.workspace.getConfiguration("qb64pe").get<boolean>(SETTING, true);
  }

  private schedule(): void {
    if (!this.enabled()) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.refresh(), DEBOUNCE_MS);
  }

  refresh(): void {
    if (!this.enabled()) {
      this.collection.clear();
      return;
    }
    try {
      for (const document of vscode.workspace.textDocuments) {
        if (document.languageId !== "QB64PE" || document.uri.scheme !== "file") continue;
        this.workspaceIndex.ensureDocument(document);
        const key = this.workspaceIndex.keyOf(document);
        const diagnostics = diagnose(this.workspaceIndex.index, key);
        this.collection.set(document.uri, diagnostics.map(toVsDiagnostic));
      }
    } catch (error) {
      logFunctions.writeLine(`ERROR in IndexDiagnostics: ${error}`, this.outputChannel);
    }
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    for (const d of this.disposables) d.dispose();
  }
}

function toVsDiagnostic(d: Diagnostic): vscode.Diagnostic {
  const severity =
    d.severity === "error"
      ? vscode.DiagnosticSeverity.Error
      : d.severity === "warning"
        ? vscode.DiagnosticSeverity.Warning
        : vscode.DiagnosticSeverity.Hint;
  const diagnostic = new vscode.Diagnostic(toVsRange(d.range), d.message, severity);
  diagnostic.source = "QB64PE-index";
  diagnostic.code = d.code;
  if (d.unnecessary) diagnostic.tags = [vscode.DiagnosticTag.Unnecessary];
  return diagnostic;
}
