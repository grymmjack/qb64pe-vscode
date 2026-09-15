import * as vscode from "vscode";
import { identifierAt } from "./core/lexer";

/**
 * Gets a new vscode.DocumentSelector
 */
export function getDocumentSelector(): vscode.DocumentSelector {
  return { scheme: "file", language: "QB64PE" };
}

/**
 * Gets the selected editor text is nothing is selected return empty string.
 * @returns The text selected in the current editor or the whole line if no text is selected.
 */
export function getSelectedTextOrLineTest(): string {
  let editor = vscode.window.activeTextEditor;
  let retvalue = editor ? editor.document.getText(editor.selection) : "";

  if (retvalue.length < 1) {
    retvalue = editor.document.lineAt(
      vscode.window.activeTextEditor.selection.active.line
    ).text;
  }
  return retvalue;
}

/**
 * Escapes RegExp text value.  Found at https://stackoverflow.com/questions/3115150/how-to-escape-regular-expression-special-characters-using-javascript
 * @param text
 * @returns
 */
export function escapeRegExp(text: string) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

/**
 * Gets an absolute path from a relative path.
 * @param base Base folder
 * @param relative The relative file path.
 * @returns can absolute path from a relative path.
 */
export function getAbsolutePath(base: string, relative: string): string {
  let work: string[] = base.split("/");
  let relativeArray = relative.split("/");
  work.pop(); // ignore the current file name (or no string)
  // (ignore if "base" is the current folder without having slash in trail)
  for (let i = 0; i < relativeArray.length; i++) {
    if (relativeArray[i] == ".") continue;
    if (relativeArray[i] == "..") {
      work.pop();
    } else {
      work.push(relativeArray[i]);
    }
  }
  return work.join("/");
}

/**
 * Creates a new range object from a regex match.
 * @param match Match with the start and stop for the range.
 * @param lineNumber Line Number in the source file that range is for.
 * @param matchIndex The index in the match array to use.
 * @returns
 */
export function createRange(
  match: RegExpMatchArray,
  lineNumber: number,
  matchIndex: number = 0
) {
  return new vscode.Range(
    new vscode.Position(lineNumber, match.index),
    new vscode.Position(lineNumber, match.index + match[matchIndex].length)
  );
}

/**
 * Gets the QB64PE word at the current cursor position in the current from the passed editor.
 * @param editor
 * @returns The selected word/word under the cursor
 */
export function getQB64Word(editor: vscode.TextEditor): string {
  if (!editor) {
    return "";
  }

  if (!editor.document) {
    return "";
  }

  return getQB64WordFromDocument(editor.document, editor.selection.active);
}

/**
 * Gets the QB64PE identifier (with its type sigil, e.g. `count%`, `name$`)
 * at the given position. Returns "" when the position is inside a comment or
 * string literal, or not on an identifier. Dots split member paths, so on
 * `player.pos` the result is the single segment under the cursor.
 * @param document
 * @param position
 */
export function getQB64WordFromDocument(
  document: vscode.TextDocument,
  position: vscode.Position
): string {
  const lineOfCode = document.lineAt(position.line).text;
  const identifier = identifierAt(lineOfCode, position.character);
  return identifier ? identifier.word : "";
}
