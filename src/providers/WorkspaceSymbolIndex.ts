"use strict";
import * as vscode from "vscode";
import * as logFunctions from "../logFunctions";
import {
  SymbolIndex,
  createIncludeResolver,
  diskLoader,
  isQB64File,
  normalizePath,
} from "../core/index";

const GLOB = "**/*.{bas,bi,bm,inc,BAS,BI,BM,INC}";
const EXCLUDE = "**/{node_modules,.git}/**";
const DEBOUNCE_MS = 250;

/**
 * VS Code adapter around the core SymbolIndex: scans the workspace, keeps the
 * index in step with edits (including unsaved buffers), disk changes, file
 * creation/deletion/renames and workspace-folder changes, and lets providers
 * force the current text of a document in before answering a request.
 */
export class WorkspaceSymbolIndex implements vscode.Disposable {
  readonly index: SymbolIndex;

  private readonly disposables: vscode.Disposable[] = [];
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  /** document.version last indexed, per file key. */
  private readonly versions = new Map<string, number>();
  private readonly changeEmitter = new vscode.EventEmitter<string[]>();
  private readonly outputChannel = logFunctions.getChannel(
    logFunctions.channelType.symbolParser
  );
  private ready: Promise<void>;

  /** Fires with the keys of files whose symbols changed. */
  readonly onDidChange: vscode.Event<string[]> = this.changeEmitter.event;

  constructor() {
    this.index = new SymbolIndex(
      createIncludeResolver(this.roots()),
      diskLoader
    );
    this.ready = this.scan();

    const watcher = vscode.workspace.createFileSystemWatcher(GLOB);
    this.disposables.push(
      watcher,
      watcher.onDidCreate((uri) => this.indexFromDisk(uri)),
      watcher.onDidChange((uri) => this.indexFromDisk(uri)),
      watcher.onDidDelete((uri) => this.remove(uri)),
      vscode.workspace.onDidOpenTextDocument((d) => this.ensureDocument(d)),
      vscode.workspace.onDidChangeTextDocument((e) =>
        this.scheduleDocument(e.document)
      ),
      vscode.workspace.onDidCloseTextDocument((d) => this.indexFromDisk(d.uri)),
      vscode.workspace.onDidRenameFiles((e) => {
        for (const { oldUri, newUri } of e.files) {
          if (isQB64File(oldUri.fsPath)) this.remove(oldUri);
          if (isQB64File(newUri.fsPath)) this.indexFromDisk(newUri);
        }
      }),
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        this.ready = this.scan(true);
      })
    );
  }

  /** Resolves once the initial workspace scan has finished. */
  whenReady(): Promise<void> {
    return this.ready;
  }

  /** Canonical index key for a document or path. */
  keyOf(target: vscode.Uri | vscode.TextDocument | string): string {
    if (typeof target === "string") return normalizePath(target);
    const uri = "uri" in target ? target.uri : target;
    return normalizePath(uri.fsPath);
  }

  /**
   * Makes sure the document's current text is what the index holds. Providers
   * call this first so results reflect the latest keystroke, not the debounce.
   */
  ensureDocument(document: vscode.TextDocument): void {
    if (!this.isIndexable(document)) return;
    const key = this.keyOf(document);
    if (this.versions.get(key) === document.version) return;
    this.cancelTimer(key);
    this.versions.set(key, document.version);
    this.index.setFile(key, document.getText());
    this.changeEmitter.fire([key]);
  }

  dispose(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    for (const d of this.disposables) d.dispose();
    this.changeEmitter.dispose();
  }

  // ---- internals ---------------------------------------------------------

  private roots(): string[] {
    const roots = (vscode.workspace.workspaceFolders ?? []).map(
      (f) => f.uri.fsPath
    );
    const installPath = vscode.workspace
      .getConfiguration("qb64pe")
      .get<string>("installPath");
    if (installPath) roots.push(installPath);
    return roots;
  }

  private async scan(rescan = false): Promise<void> {
    try {
      if (rescan) {
        this.index.clear();
        this.versions.clear();
      }
      const uris = await vscode.workspace.findFiles(GLOB, EXCLUDE);
      const entries: [string, string][] = [];
      for (const uri of uris) {
        const content = diskLoader(uri.fsPath);
        if (content !== null) entries.push([this.keyOf(uri), content]);
      }
      this.index.loadMany(entries);
      // Open (possibly dirty) documents win over what is on disk.
      for (const document of vscode.workspace.textDocuments) {
        this.ensureDocument(document);
      }
      logFunctions.writeLine(
        `SymbolIndex: indexed ${this.index.size} files`,
        this.outputChannel
      );
      this.changeEmitter.fire(this.index.paths());
    } catch (error) {
      logFunctions.writeLine(
        `SymbolIndex: scan failed: ${error}`,
        this.outputChannel
      );
    }
  }

  private isIndexable(document: vscode.TextDocument): boolean {
    return (
      document.uri.scheme === "file" &&
      (document.languageId === "QB64PE" || isQB64File(document.uri.fsPath))
    );
  }

  private scheduleDocument(document: vscode.TextDocument): void {
    if (!this.isIndexable(document)) return;
    const key = this.keyOf(document);
    this.cancelTimer(key);
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key);
        this.ensureDocument(document);
      }, DEBOUNCE_MS)
    );
  }

  private cancelTimer(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  private indexFromDisk(uri: vscode.Uri): void {
    if (!isQB64File(uri.fsPath)) return;
    const key = this.keyOf(uri);
    // A dirty open buffer is the source of truth, not the disk.
    const open = vscode.workspace.textDocuments.find(
      (d) => this.keyOf(d) === key
    );
    if (open && open.isDirty) return;
    if (!open) this.versions.delete(key);

    const content = diskLoader(uri.fsPath);
    if (content === null) {
      this.remove(uri);
      return;
    }
    this.index.setFile(key, content);
    this.changeEmitter.fire([key]);
  }

  private remove(uri: vscode.Uri): void {
    const key = this.keyOf(uri);
    this.cancelTimer(key);
    this.versions.delete(key);
    if (this.index.removeFile(key)) this.changeEmitter.fire([key]);
  }
}
