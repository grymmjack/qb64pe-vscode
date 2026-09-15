import * as vscode from "vscode";
import { Occurrence, Range } from "../core/queries";

export function toVsRange(range: Range): vscode.Range {
  return new vscode.Range(
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character
  );
}

export function toVsLocation(occurrence: Occurrence): vscode.Location {
  return new vscode.Location(
    vscode.Uri.file(occurrence.file),
    toVsRange(occurrence.range)
  );
}
