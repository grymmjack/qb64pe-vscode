/**
 * Rename support (vscode-free): validates a new name for a symbol and turns
 * findOccurrences into concrete text edits.
 */
import { QB64Symbol } from "./symbols";
import { SymbolIndex } from "./index";
import { Occurrence, findOccurrences } from "./queries";
import { stripSigil } from "./parser";

export interface TextEdit {
  file: string;
  range: Occurrence["range"];
  newText: string;
}

const IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]*(?:~?(?:%%|&&|##|[%&!#`])|\$)?$/;

function sigilOf(name: string): string {
  return name.substring(stripSigil(name).length);
}

/** Null when `newName` is acceptable for `symbol`, else a reason. */
export function validateNewName(symbol: QB64Symbol, newName: string): string | null {
  const name = newName.trim();
  if (!name) return "Name must not be empty.";
  if (name.startsWith("_")) {
    return "Names starting with an underscore are reserved for QB64PE keywords.";
  }
  if (symbol.type === "LABEL") {
    return /^[A-Za-z][A-Za-z0-9_]*$/.test(name) ? null : "Not a valid label name.";
  }
  if (!IDENTIFIER.test(name)) return "Not a valid QB64PE identifier.";
  if (sigilOf(name) !== sigilOf(symbol.name)) {
    const expected = sigilOf(symbol.name);
    return expected
      ? `The type sigil must stay \`${expected}\` (rename to \`${stripSigil(name)}${expected}\`).`
      : "Adding a type sigil would change the symbol's type.";
  }
  return null;
}

/**
 * Edits renaming every occurrence of `symbol`. Each occurrence keeps its own
 * spelling with respect to the sigil: a call written `Add(1)` for
 * `FUNCTION Add%` becomes `NewName(1)`, the declaration becomes `NewName%`.
 */
export function renameEdits(
  index: SymbolIndex,
  symbol: QB64Symbol,
  newName: string
): TextEdit[] {
  const base = stripSigil(newName);
  return findOccurrences(index, symbol, true).map((o) => {
    const text = index.get(o.file)?.lines[o.range.start.line] ?? "";
    const old = text.substring(o.range.start.character, o.range.end.character);
    const keepsSigil = sigilOf(old) !== "";
    return { file: o.file, range: o.range, newText: keepsSigil ? newName : base };
  });
}
