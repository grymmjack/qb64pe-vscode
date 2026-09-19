"use strict";
import * as vscode from "vscode";
import * as fs from "fs";
import * as gitFunctions from "./gitFunctions";
import * as vscodeFunctions from "./vscodeFunctions";
import * as decoratorFunctions from "./decoratorFunctions";
import * as lintFunctions from "./lintFunctions";
import * as logFunctions from "./logFunctions";
import * as commonFunctions from "./commonFunctions";
import * as webViewFunctions from "./webViewFunctions";
import * as openInQB64PEFunctions from "./openInQB64PEFunctions";
import * as todoFunctions from "./todoFunctions";
import * as path from "path";
import { ReferenceProvider } from "./providers/ReferenceProvider";
import { DefinitionProvider } from "./providers/DefinitionProvider";
import { DocumentSymbolProvider } from "./providers/DocumentSymbolProvider";
import { DocumentFormattingEditProvider } from "./providers/DocumentFormattingEditProvider";
import {
  DebugAdapterDescriptorFactory,
  QB64PEDebugConfigurationProvider,
} from "./providers/DebugAdapterDescriptorFactory";
import { HoverProvider } from "./providers/HoverProvider";
import { HelpService } from "./providers/HelpService";
import { CompletionItemProvider } from "./providers/CompletionItemProvider";
import { InlineCompletionItemProvider } from "./providers/InlineCompletionItemProvider";
import { SignatureHelpProvider } from "./providers/SignatureHelpProvider";
import { RenameProvider } from "./providers/RenameProvider";
import { DocumentHighlightProvider } from "./providers/DocumentHighlightProvider";
import { WorkspaceSymbolProvider } from "./providers/WorkspaceSymbolProvider";
import { FoldingRangeProvider } from "./providers/FoldingRangeProvider";
import { IndexDiagnostics } from "./providers/IndexDiagnostics";
import { CallHierarchyProvider } from "./providers/CallHierarchyProvider";
import {
  SemanticTokensProvider,
  semanticTokensLegend,
} from "./providers/SemanticTokensProvider";
import { WorkspaceSymbolIndex } from "./providers/WorkspaceSymbolIndex";
import { TodoTreeProvider } from "./TodoTreeProvider";
import { align, AlignOptions } from "./core/align";

// To switch to debug mode the scripts in the package.json need to be changed.
// https://code.visualstudio.com/api/working-with-extensions/bundling-extension#Publishing

// TODO: Get the TODOs window working.
// 	This needs to go in the package.json in the contributes
// 	,
//         "views": {
//             "explorer": [
//                 {
//                     "id": "todo",
//                     "name": "TODOs",
//                     "icon": "images\\todo.svg",
//                     "contextualTitle": "View TODOs"
//                 }
//             ]
//         }

export var todoTreeProvider: TodoTreeProvider = null;
export async function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("qb64pe");
  const documentSelector: vscode.DocumentSelector =
    commonFunctions.getDocumentSelector();

  vscode.workspace.onWillSaveTextDocument(() => {
    if (config.get("isCreateBakFileEnabled")) {
      createBackup();
    }
  });

  vscode.workspace.onDidSaveTextDocument(() => {
    if (config.get("isLintOnSaveEnabled")) {
      runLint();
    }
  });

  // Register Commands here
  webViewFunctions.setupAsciiChart(context);
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.showHelp", () => {
      const editor = vscode.window.activeTextEditor;
      const selected = editor ? editor.document.getText(editor.selection) : "";
      const token =
        selected.length > 0
          ? selected.split(" ")[0]
          : commonFunctions.getQB64Word(editor);
      helpService.openHelp(token);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.openCompileLog", () => {
      openCompileLog();
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("qb64pe.buildHelp", () => helpService.buildAllHelp())
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "extension.showHelpIndexAlphabetical",
      () => {
        showHelpByName("Keyword-Reference---Alphabetical");
      }
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.showHelpIndexUsage", () => {
      showHelpByName("Keyword-Reference---By-Usage");
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.runLint", () => {
      runLint();
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.openCurrentFileInQB64PE", () => {
      openCurrentFileInQB64PE();
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "extension.addToGitIgnore",
      async (...selectedItems) => {
        addToGitIgnore(selectedItems);
      }
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.removeLineNumbers", () => {
      removeLineNumbers();
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.renumberLines", () => {
      renumberLines();
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("qb64pe.alignSource", () => {
      alignSource();
    })
  );

  // Register Providers here
  // One workspace-wide symbol index shared by every language provider.
  const workspaceIndex = new WorkspaceSymbolIndex();
  context.subscriptions.push(workspaceIndex);
  const helpService = new HelpService(context);

  context.subscriptions.push(
    vscode.languages.registerReferenceProvider(
      commonFunctions.getDocumentSelector(),
      new ReferenceProvider(workspaceIndex)
    )
  );
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      commonFunctions.getDocumentSelector(),
      new DefinitionProvider(workspaceIndex, helpService)
    )
  );
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      documentSelector,
      new DocumentSymbolProvider(workspaceIndex)
    )
  );
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      documentSelector,
      new HoverProvider(workspaceIndex, helpService)
    )
  );
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      documentSelector,
      new DocumentFormattingEditProvider()
    )
  );
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      documentSelector,
      new CompletionItemProvider(workspaceIndex),
      ".",
      "$",
      "_"
    )
  );
  context.subscriptions.push(
    vscode.languages.registerInlineCompletionItemProvider(
      documentSelector,
      new InlineCompletionItemProvider(workspaceIndex)
    )
  );
  context.subscriptions.push(
    vscode.languages.registerSignatureHelpProvider(
      documentSelector,
      new SignatureHelpProvider(workspaceIndex),
      "(",
      ","
    )
  );

  context.subscriptions.push(
    vscode.languages.registerRenameProvider(
      documentSelector,
      new RenameProvider(workspaceIndex)
    )
  );

  context.subscriptions.push(
    vscode.languages.registerDocumentHighlightProvider(
      documentSelector,
      new DocumentHighlightProvider(workspaceIndex)
    )
  );
  context.subscriptions.push(
    vscode.languages.registerWorkspaceSymbolProvider(
      new WorkspaceSymbolProvider(workspaceIndex)
    )
  );

  context.subscriptions.push(
    vscode.languages.registerFoldingRangeProvider(
      documentSelector,
      new FoldingRangeProvider()
    )
  );

  const semanticTokensProvider = new SemanticTokensProvider(workspaceIndex);
  context.subscriptions.push(
    semanticTokensProvider,
    vscode.languages.registerDocumentSemanticTokensProvider(
      documentSelector,
      semanticTokensProvider,
      semanticTokensLegend
    )
  );

  context.subscriptions.push(
    vscode.languages.registerCallHierarchyProvider(
      documentSelector,
      new CallHierarchyProvider(workspaceIndex)
    )
  );
  context.subscriptions.push(new IndexDiagnostics(workspaceIndex));

  // Register Miscellaneous
  // F5 build & run: the adapter type must match the "QB64PE" debugger
  // contributed in package.json (the old registration used "qb64pe").
  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory(
      "QB64PE",
      new DebugAdapterDescriptorFactory(workspaceIndex)
    ),
    vscode.debug.registerDebugConfigurationProvider(
      "QB64PE",
      new QB64PEDebugConfigurationProvider()
    ),
    // Dynamic kind so F5 on a .bas offers "QB64PE: Debug" directly.
    vscode.debug.registerDebugConfigurationProvider(
      "QB64PE",
      new QB64PEDebugConfigurationProvider(),
      vscode.DebugConfigurationProviderTriggerKind.Dynamic
    )
  );

  // Reveal the debug UI when a QB64PE session starts (each pane independently
  // opt-in). Revealing also un-hides a pane that is currently collapsed. We
  // focus the Run and Debug view last so keyboard focus lands there.
  context.subscriptions.push(
    vscode.debug.onDidStartDebugSession(async (session) => {
      if (session.type !== "QB64PE") {
        return;
      }
      const cfg = vscode.workspace.getConfiguration("qb64pe");
      const wantView = cfg.get<boolean>("debug.focusRunDebugViewOnStart", true);
      const wantConsole = cfg.get<boolean>("debug.focusDebugConsoleOnStart", true);
      if (!wantView && !wantConsole) {
        return;
      }
      // Let VS Code finish its own session-start layout before we reveal panes.
      await new Promise((resolve) => setTimeout(resolve, 250));
      const reveal = async (command: string) => {
        try {
          await vscode.commands.executeCommand(command);
        } catch {
          /* command unavailable in this VS Code build — try the next */
        }
      };
      // Reveal the Run and Debug view first, then the Debug Console last, so
      // when both are on the console ends focused (where output/trace appear).
      // Each `.focus` command also un-hides a collapsed pane.
      if (wantView) {
        await reveal("workbench.view.debug");
      }
      if (wantConsole) {
        await reveal("workbench.debug.action.focusRepl");
        await reveal("workbench.panel.repl.view.focus");
      }
    })
  );

  decoratorFunctions.setupDecorate(workspaceIndex);
  vscodeFunctions.createFiles();
  gitFunctions.createGitignore();

  let tempPath: string = config.get("helpPath");
  if (tempPath == null || tempPath.length < 1) {
    //let tempPath = path.join(context.extensionPath, "help");
    config.update(
      "helpPath",
      context.extensionPath,
      vscode.ConfigurationTarget.Global
    );
  }

  // Todo window stuff
  todoTreeProvider = new TodoTreeProvider();
  vscode.window.registerTreeDataProvider("todo", todoTreeProvider);
  vscode.commands.registerCommand("extension.refreshTodo", () =>
    todoTreeProvider.refresh()
  );
  todoFunctions.setupTodoTracking(context, todoTreeProvider);

  // Exposed as the extension's API (used by the integration tests).
  return { workspaceIndex };
}

/**
 * Tries to find compilelog.txt and open it.
 */
export function openCompileLog() {
  const config = vscode.workspace.getConfiguration("qb64pe");
  try {
    // The compile log lives under the QB64PE root's internal/<temp*> folder.
    // Prefer the compiler's directory (compilerPath points at the executable),
    // and fall back to installPath (already the QB64PE root). Resolve to an
    // absolute path so an unset/bare setting can't collapse to "." and open
    // "./internal/temp/compilelog.txt" relative to the workspace.
    const compilerPath = (config.get<string>("compilerPath") ?? "").trim();
    const installPath = (config.get<string>("installPath") ?? "").trim();
    let baseFolder = compilerPath ? path.dirname(compilerPath) : installPath;
    if (baseFolder) {
      baseFolder = path.resolve(baseFolder).replaceAll("\\", "/");
      if (findAndOpenCompileLog(baseFolder, "temp")) {
        return;
      } else if (findAndOpenCompileLog(baseFolder, "temp1")) {
        return;
      } else if (findAndOpenCompileLog(baseFolder, "temp2")) {
        return;
      } else if (findAndOpenCompileLog(baseFolder, "temp3")) {
        return;
      } else if (findAndOpenCompileLog(baseFolder, "temp4")) {
        return;
      } else if (findAndOpenCompileLog(baseFolder, "temp5")) {
        return;
      } else if (findAndOpenCompileLog(baseFolder, "temp6")) {
        return;
      } else if (findAndOpenCompileLog(baseFolder, "temp7")) {
        return;
      } else if (findAndOpenCompileLog(baseFolder, "temp8")) {
        return;
      } else if (findAndOpenCompileLog(baseFolder, "temp9")) {
        return;
      } else {
        vscode.window.showErrorMessage("Unable to open compilelog.txt");
      }
    } else {
      vscode.window.showErrorMessage(
        "Set qb64pe.compilerPath (or qb64pe.installPath) to locate compilelog.txt."
      );
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error IN openCompileLog: ${error}`);
  }
}

/**
 * Looks in the temp folder for compilelog.txt, if it's found the file is opened
 * @param qb64InstallPath The QB64PE install path
 * @param tempFolderName Name of the temp folder to check
 * @returns True if the file was found and opened
 */
function findAndOpenCompileLog(
  qb64InstallPath: string,
  tempFolderName: string
) {
  try {
    const logPath = `${qb64InstallPath}/internal/${tempFolderName}/compilelog.txt`;
    // Only open a log that actually exists — otherwise the first candidate
    // (temp) would always "succeed" and the temp1..temp9 fallbacks (and the
    // not-found message) would be unreachable.
    if (fs.existsSync(logPath)) {
      vscode.commands.executeCommand("vscode.open", vscode.Uri.file(logPath));
      return true;
    }
    return false;
  } catch (error) {
    vscode.window.showErrorMessage(`Error in findAndOpenCompileLog: ${error}`);
  }
}

/**
 * Removes the line numbers from the current code file.
 * @param document Current TextDocument
 */
export function removeLineNumbers() {
  try {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    const document: vscode.TextDocument = editor.document;
    const edit = new vscode.WorkspaceEdit();

    for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber++) {
      edit.replace(
        document.uri,
        document.lineAt(lineNumber).range,
        document.lineAt(lineNumber).text.replace(/\d+/g, "").trim()
      );
    }
    vscode.workspace.applyEdit(edit);
  } catch (error) {
    vscode.window.showErrorMessage(error);
  }
}

/**
 * Column-align the active QB64PE document (or the selected line range) using
 * the qb64pe.formatAlign* settings. This is a deliberate, on-demand command —
 * alignment is intentionally NOT part of Format Document / format-on-save,
 * because padding interior columns is more invasive than the whitespace-only
 * indentation the formatter does.
 */
export function alignSource() {
  try {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    const config = vscode.workspace.getConfiguration("qb64pe");
    const scope = config.get<string>("formatAlignScope", "block");
    const options: AlignOptions = {
      assignments: config.get<boolean>("formatAlignAssignments", true),
      declarations: config.get<boolean>("formatAlignDeclarations", true),
      case: config.get<boolean>("formatAlignCase", true),
      colons: config.get<boolean>("formatAlignColons", true),
      comments: config.get<boolean>("formatAlignComments", true),
      scope: scope === "section" ? "section" : "block",
      gap: Math.max(1, config.get<number>("formatAlignGap", 1)),
    };

    const document = editor.document;
    // Align the selected whole-line range, or the whole document when nothing
    // is selected. Grouping is self-contained within the range.
    const selection = editor.selection;
    const startLine = selection.isEmpty ? 0 : selection.start.line;
    const endLine = selection.isEmpty ? document.lineCount - 1 : selection.end.line;
    const range = new vscode.Range(
      new vscode.Position(startLine, 0),
      document.lineAt(endLine).range.end
    );

    const original = document.getText(range);
    const aligned = align(original, options);
    if (aligned === original) {
      return; // nothing to change — don't push an empty edit
    }
    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, range, aligned);
    vscode.workspace.applyEdit(edit);
  } catch (error) {
    vscode.window.showErrorMessage(`Error in alignSource: ${error}`);
  }
}

/**
 * Renumber the lines the current code file.
 * @param document Current TextDocument
 */
export function renumberLines() {
  try {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    const document: vscode.TextDocument = editor.document;
    const edit = new vscode.WorkspaceEdit();

    for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber++) {
      edit.replace(
        document.uri,
        document.lineAt(lineNumber).range,
        `${lineNumber + 1} ${document
          .lineAt(lineNumber)
          .text.replace(/\d+/g, "")
          .trim()}`
      );
    }
    vscode.workspace.applyEdit(edit);
  } catch (error) {
    vscode.window.showErrorMessage(error);
  }
}

/**
 * Opens the current file in QB64
 */
export function openCurrentFileInQB64PE() {
  openInQB64PEFunctions.openCurrentFileInQB64PE();
}

/**
 * Add the items to .GitIgnore
 * @param items The items selected in the explorer view
 */
export function addToGitIgnore(items: any) {
  gitFunctions.addToGitIgnore(items);
}

export function showHelpByName(itemName: string) {
  const config = vscode.workspace.getConfiguration("qb64pe");
  const path = require("path");

  let helpPath: string = config.get("installPath");
  let helpFile = path
    .join(helpPath, "internal", "help", `${itemName}.md`)
    .replaceAll("\\", "/");
  if (fs.existsSync(helpFile)) {
    if (config.get("isOpenHelpInEditModeEnabled")) {
      vscode.workspace
        .openTextDocument(helpFile)
        .then((d) => vscode.window.showTextDocument(d));
    } else {
      vscode.commands.executeCommand(
        "markdown.showPreview",
        vscode.Uri.file(helpFile)
      );
    }
  } else if (config.get("isOpenOnLineHelpEnabled")) {
    vscode.commands.executeCommand(
      "vscode.open",
      vscode.Uri.parse(
        `https://qb64phoenix.com/qb64wiki/index.php/${encodeURIComponent(
          itemName
        )}`
      )
    );
  }
}

/**
 * Compiles the current file then lints the current file.
 */
export function runLint() {
  lintFunctions.runLint();
}

/**
 * Creates a backup of the current file.
 * @returns True if the file was created
 */
function createBackup() {
  let outputChannel: any = logFunctions.getChannel(
    logFunctions.channelType.createBackup
  );
  try {
    if (
      !vscode.window.activeTextEditor ||
      vscode.window.activeTextEditor.document.languageId != "QB64PE"
    ) {
      return false;
    }

    let filename: string = vscode.window.activeTextEditor.document.fileName;

    if (
      !(
        filename.endsWith(".bas") ||
        filename.endsWith(".bm") ||
        filename.endsWith(".bi")
      )
    ) {
      return false;
    }

    let source = vscode.window.activeTextEditor.document.fileName;
    let backupFile = source + "-bak";
    outputChannel.appendLine(`Trying to copy ${source} to ${backupFile}`);
    fs.copyFileSync(source, backupFile);
    outputChannel.appendLine(`File ${source} copied to ${backupFile}`);
    return true;
  } catch (error) {
    outputChannel.appendLine(`ERROR: in createBackup:  ${error}`);
    return false;
  }
}
