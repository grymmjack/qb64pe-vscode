"use strict";
import * as vscode from "vscode";
import { TodoItem } from "./TodoItem";
import { TodoTreeProvider } from "./TodoTreeProvider";
import { scanLine } from "./core/lexer";

const TODO = /\b(todo|fixit|fixme)\b:?/i;
const DEBOUNCE_MS = 300;

/**
 * Keeps the "QB64PE TODOs" view in step with the active editor. Runs on its
 * own listeners (initially, on editor switch and on edits) instead of as a
 * side effect of building the outline.
 */
export function setupTodoTracking(
  context: vscode.ExtensionContext,
  todoTreeProvider: TodoTreeProvider
): void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = (document: vscode.TextDocument | undefined) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => refreshTodos(document, todoTreeProvider), DEBOUNCE_MS);
  };

  refreshTodos(vscode.window.activeTextEditor?.document, todoTreeProvider);
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) =>
      refreshTodos(editor?.document, todoTreeProvider)
    ),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document === vscode.window.activeTextEditor?.document) schedule(e.document);
    }),
    { dispose: () => timer && clearTimeout(timer) }
  );
}

/** Rebuilds the TODO tree from the comments of `document` (or clears it). */
export function refreshTodos(
  document: vscode.TextDocument | undefined,
  todoTreeProvider: TodoTreeProvider
): void {
  todoTreeProvider.clear();
  if (document && document.languageId === "QB64PE") {
    for (let line = 0; line < document.lineCount; line++) {
      const text = document.lineAt(line).text;
      const scan = scanLine(text);
      if (scan.commentStart < 0) continue;
      const comment = text.substring(scan.commentStart);
      const match = comment.match(TODO);
      if (!match) continue;
      const note = comment.substring(match.index! + match[0].length).trim();
      todoTreeProvider.addTodoItem(
        new TodoItem(
          note || match[1].toUpperCase(),
          vscode.TreeItemCollapsibleState.None,
          new vscode.Range(line, 0, line, text.length),
          document.uri
        )
      );
    }
  }
  todoTreeProvider.refresh();
}
