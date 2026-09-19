"use strict";
import * as vscode from "vscode";
import { scanLine } from "../core/lexer";

/**
 * Tells VS Code's debug hover exactly which expression to evaluate under the
 * cursor, so hovering a member (`CFG.FULLSCREEN`), an array element (`colW(3)`)
 * or a chain (`p.pos.x`) shows the value — not just the bare word. Without this,
 * VS Code grabs a single identifier and the evaluate fails for anything dotted
 * or indexed. Strings/comments are masked so hovering inside a literal is inert.
 */
export class QB64EvaluatableExpressionProvider
  implements vscode.EvaluatableExpressionProvider
{
  // ident (+optional sigil, +optional (...) index), joined by '.' into a chain.
  private static readonly EXPR =
    /[A-Za-z_][A-Za-z0-9_]*[%&!#$~]*(?:\s*\([^()]*\))?(?:\.[A-Za-z_][A-Za-z0-9_]*[%&!#$~]*(?:\s*\([^()]*\))?)*/g;

  provideEvaluatableExpression(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.EvaluatableExpression> {
    const line = document.lineAt(position.line).text;
    const mask = scanLine(line).mask; // don't evaluate inside strings/comments
    const col = position.character;
    QB64EvaluatableExpressionProvider.EXPR.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = QB64EvaluatableExpressionProvider.EXPR.exec(mask)) !== null) {
      const start = m.index;
      const end = m.index + m[0].length;
      if (col >= start && col <= end) {
        const range = new vscode.Range(position.line, start, position.line, end);
        // Use the real text (mask has same columns) for the expression string.
        return new vscode.EvaluatableExpression(range, line.slice(start, end).trim());
      }
      if (start > col) break;
    }
    return undefined;
  }
}
