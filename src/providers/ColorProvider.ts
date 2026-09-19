"use strict";
import * as vscode from "vscode";
import { findColors, formatColor } from "../core/colors";

/**
 * Inline colour chips + native picker for QB64PE colour calls. Any `_RGB32`/
 * `_RGBA32`/`_RGB`/`_RGBA` or `_HSB*`/`_HSBA*` call with integer-literal
 * arguments gets a swatch (wherever it appears — inside COLOR, LINE, PAINT,
 * _PRINTSTRING, …). Picking a colour rewrites the call, preserving its function
 * name and argument arity. The detection/maths live in the vscode-free core.
 */
export class ColorProvider implements vscode.DocumentColorProvider {
  provideDocumentColors(
    document: vscode.TextDocument
  ): vscode.ColorInformation[] {
    const text = document.getText();
    return findColors(text).map(
      (h) =>
        new vscode.ColorInformation(
          new vscode.Range(document.positionAt(h.start), document.positionAt(h.end)),
          new vscode.Color(h.r / 255, h.g / 255, h.b / 255, h.a / 255)
        )
    );
  }

  provideColorPresentations(
    color: vscode.Color,
    context: { document: vscode.TextDocument; range: vscode.Range }
  ): vscode.ColorPresentation[] {
    const original = context.document.getText(context.range);
    const m = /^(_(?:RGBA?|HSBA?)(?:32)?)\s*\(([^)]*)\)/i.exec(original);
    if (!m) return [];
    const func = m[1];
    const argCount = m[2].trim() === "" ? 0 : m[2].split(",").length;
    const to255 = (c: number) => Math.round(c * 255);
    const text = formatColor(
      func,
      argCount,
      to255(color.red),
      to255(color.green),
      to255(color.blue),
      to255(color.alpha)
    );
    const presentation = new vscode.ColorPresentation(text);
    presentation.textEdit = vscode.TextEdit.replace(context.range, text);
    return [presentation];
  }
}
