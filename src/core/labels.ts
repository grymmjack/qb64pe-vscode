/**
 * Named line labels on their own line (vscode-free, unit-tested).
 *
 * The parser only indexes a named label that stands alone on its line
 * (`handler:`), because `name: stmt` is usually a compound statement — a
 * no-argument SUB call followed by another statement (`cursor_erase:
 * cursor_draw`). The formatter and aligner move a real label's trailing
 * statements onto the next line, so `retry: PRINT x` becomes
 *
 *     retry:
 *     PRINT x
 *
 * A line is split only when its first statement is a bare name that is not a
 * keyword and that the caller says is not a SUB/FUNCTION. Splitting a SUB call
 * would silently turn the call into a label, so callers must answer
 * `isRoutine` conservatively (true when unsure).
 */
import { hasLineContinuation, scanLine, splitStatements } from "./lexer";
import { isKeyword } from "./keywords";

const LABEL_NAME = /^[A-Za-z][A-Za-z0-9_]*$/;

/**
 * `[label, rest]` when `line` is `label: statement…` and should be split,
 * otherwise null. Both keep the line's indentation; `label` is normalized to
 * `name:` and `rest` keeps any trailing comment.
 */
export function splitInlineLabel(
  line: string,
  isRoutine: (name: string) => boolean
): [string, string] | null {
  const scan = scanLine(line);
  if (scan.isMetacommand || scan.colons.length === 0) return null;
  const statements = splitStatements(line, scan);
  if (statements.length < 2 || statements.slice(1).every((s) => s.text === "")) return null;
  const name = statements[0].text;
  if (!LABEL_NAME.test(name) || isKeyword(name) || isRoutine(name)) return null;

  const indent = line.slice(0, line.length - line.trimStart().length);
  return [`${indent}${name}:`, indent + line.slice(scan.colons[0] + 1).trim()];
}

/**
 * Split every `label: statement…` line in `lines` (see splitInlineLabel).
 * Physical lines that continue a previous `_` line are never split.
 */
export function splitInlineLabels(
  lines: string[],
  isRoutine: (name: string) => boolean
): string[] {
  const out: string[] = [];
  let continued = false;
  for (const line of lines) {
    const split = continued ? null : splitInlineLabel(line, isRoutine);
    if (split) out.push(...split);
    else out.push(line);
    continued = hasLineContinuation(line);
  }
  return out;
}
