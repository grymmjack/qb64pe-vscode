/**
 * Folding ranges for QB64PE source (vscode-free). Block-aware rather than
 * indentation-based: statements are classified through the lexer, so text
 * in comments and strings never opens or closes a block. The closing line
 * (`END SUB`, `LOOP`, `NEXT`, …) is left visible, as with the indentation
 * folding this replaces.
 */
import { hasLineContinuation, scanLine, splitStatements } from "./lexer";

export interface FoldingRange {
  startLine: number;
  /** Inclusive; always > startLine. */
  endLine: number;
  kind?: "comment" | "region";
}

type Block =
  | "routine" | "type" | "declare" | "if" | "select" | "do" | "for" | "while" | "meta";

interface Open {
  block: Block;
  startLine: number;
}

const OPENERS: [RegExp, Block][] = [
  [/^(SUB|FUNCTION)\s+[A-Za-z_]/i, "routine"],
  [/^TYPE\s+[A-Za-z_]/i, "type"],
  [/^DECLARE\s+(?:(?:DYNAMIC|STATIC|CUSTOMTYPE)\s+)?LIBRARY\b/i, "declare"],
  [/^IF\b.*\bTHEN\s*$/i, "if"], // block IF: nothing after THEN
  [/^SELECT\s+(?:EVERY)?CASE\b/i, "select"],
  [/^DO\b/i, "do"],
  [/^FOR\s+[A-Za-z_]/i, "for"],
  [/^WHILE\b/i, "while"],
  [/^'?\$IF\b/i, "meta"],
];

const CLOSERS: [RegExp, Block][] = [
  [/^END\s+(SUB|FUNCTION)\b/i, "routine"],
  [/^END\s+TYPE\b/i, "type"],
  [/^END\s+DECLARE\b/i, "declare"],
  [/^END\s+IF\b/i, "if"],
  [/^END\s+SELECT\b/i, "select"],
  [/^LOOP\b/i, "do"],
  [/^NEXT\b/i, "for"],
  [/^WEND\b/i, "while"],
  [/^'?\$END\s*IF\b/i, "meta"],
];

export function foldingRanges(lines: string[]): FoldingRange[] {
  const ranges: FoldingRange[] = [];
  const stack: Open[] = [];
  let declareDepth = 0;
  let commentStart = -1;

  const closeComment = (endLine: number) => {
    if (commentStart >= 0 && endLine > commentStart) {
      ranges.push({ startLine: commentStart, endLine, kind: "comment" });
    }
    commentStart = -1;
  };

  const close = (block: Block, line: number, times = 1) => {
    for (let t = 0; t < times; t++) {
      // Tolerate mismatches: unwind to the nearest matching block.
      const at = stack.map((o) => o.block).lastIndexOf(block);
      if (at < 0) return;
      const open = stack.splice(at)[0];
      const endLine = line - 1;
      if (endLine > open.startLine) ranges.push({ startLine: open.startLine, endLine });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const startLine = i;
    let logical = lines[i];
    while (hasLineContinuation(logical) && i + 1 < lines.length) {
      logical = logical.replace(/_\s*$/, "") + " " + lines[++i].trimStart();
    }

    const scan = scanLine(logical);
    const trimmed = logical.trim();
    const isComment =
      trimmed !== "" && !scan.isMetacommand && scan.commentStart >= 0 &&
      logical.substring(0, scan.commentStart).trim() === "";
    if (isComment) {
      if (commentStart < 0) commentStart = startLine;
      continue;
    }
    if (trimmed !== "") closeComment(startLine - 1);

    for (const { text } of splitStatements(logical, scan)) {
      if (!text) continue;
      let handled = false;
      for (const [re, block] of CLOSERS) {
        if (re.test(text)) {
          const times = block === "for" ? text.split(",").length : 1;
          close(block, startLine, times);
          if (block === "declare") declareDepth = Math.max(0, declareDepth - 1);
          handled = true;
          break;
        }
      }
      if (handled) continue;
      for (const [re, block] of OPENERS) {
        if (re.test(text)) {
          if (block === "routine" && declareDepth > 0) break; // prototypes have no body
          if (block === "declare") declareDepth++;
          stack.push({ block, startLine });
          break;
        }
      }
    }
  }
  closeComment(lines.length - 1);

  return ranges.sort((a, b) => a.startLine - b.startLine || a.endLine - b.endLine);
}
