/**
 * Coordinate-pair dashes in graphics statements (vscode-free).
 *
 * `LINE (x1, y1)-(x2, y2)` is syntax, not subtraction: the `-` joins two
 * coordinate pairs and the QB64PE IDE writes it tight against both. The
 * formatter's operator spacing turns it into `) - (`; this puts it back, but
 * only inside statements that take coordinate pairs and only at parenthesis
 * depth 0, so `x = (a) - (b)` and `LINE (a - b, 0)-(1, 1)` keep their spacing.
 */
import { scanLine } from "./lexer";

/** Statements whose arguments are `(x, y)-(x, y)` pairs. */
const GRAPHICS =
  /(?:^|\b(?:THEN|ELSE)\s+)(?:LINE(?!\s+INPUT\b)|VIEW(?!\s+PRINT\b)|WINDOW|GET|PUT|_PUTIMAGE|_MAPTRIANGLE)\b/gi;

/** Tighten `) - (` / `) - STEP` (and a leading `LINE - (`) in graphics statements. */
export function tightenCoordinateDashes(line: string): string {
  const scan = scanLine(line);
  if (scan.isMetacommand) return line;
  const mask = scan.mask;
  const end = scan.commentStart >= 0 ? scan.commentStart : line.length;
  const bounds = [-1, ...scan.colons.filter((c) => c < end), end];

  // [start, end) ranges of whitespace to delete, collected left to right.
  const cuts: Array<[number, number]> = [];
  for (let b = 0; b + 1 < bounds.length; b++) {
    const segStart = bounds[b] + 1;
    const segEnd = bounds[b + 1];
    const seg = mask.slice(segStart, segEnd);
    const lead = seg.length - seg.trimStart().length;
    GRAPHICS.lastIndex = 0;
    const m = GRAPHICS.exec(seg.slice(lead));
    if (!m) continue;
    const keywordEnd = segStart + lead + m.index + m[0].length;

    let depth = 0;
    for (let i = keywordEnd; i < segEnd; i++) {
      const ch = mask[i];
      if (ch === "(") depth++;
      else if (ch === ")") depth = Math.max(0, depth - 1);
      else if (ch === "-" && depth === 0) {
        let before = i - 1;
        while (before >= keywordEnd && mask[before] === " ") before--;
        let after = i + 1;
        while (after < segEnd && mask[after] === " ") after++;
        const nextIsPair = mask[after] === "(" || /^STEP\b/i.test(mask.slice(after, segEnd));
        if (!nextIsPair) continue;
        if (before >= keywordEnd && mask[before] === ")") {
          cuts.push([before + 1, i], [i + 1, after]); // (a, b) - (c, d) -> (a, b)-(c, d)
        } else if (before < keywordEnd) {
          cuts.push([i + 1, after]); // LINE - (c, d) -> LINE -(c, d)
        }
      }
    }
  }

  let out = line;
  for (let k = cuts.length - 1; k >= 0; k--) {
    const [s, e] = cuts[k];
    if (e > s) out = out.slice(0, s) + out.slice(e);
  }
  return out;
}

/**
 * Statements and operators the QB64PE IDE writes with a space before `(`:
 * `LINE (0, 0)-(1, 1)`, `IF (a) THEN`, `x AND (y)`. Function calls and array
 * indexes (`_RGB32(`, `INT(`, `grid(`) and `STEP(` stay tight.
 */
const SPACED_BEFORE_PAREN = new Set(
  (
    "LINE PSET PRESET CIRCLE PAINT VIEW WINDOW GET PUT _PUTIMAGE _MAPTRIANGLE _PRINTSTRING " +
    "PRINT LPRINT LOCATE COLOR SOUND SWAP IF ELSEIF THEN ELSE WHILE UNTIL CASE IS TO " +
    "AND OR XOR NOT MOD EQV IMP"
  ).split(" ")
);

/** Insert the space between a statement/operator keyword and its `(`. */
export function spaceKeywordParens(line: string): string {
  const scan = scanLine(line);
  if (scan.isMetacommand) return line;
  const inserts: number[] = [];
  const re = /(?<![A-Za-z0-9_.$%&!#~`])([A-Za-z_][A-Za-z0-9_]*)\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(scan.mask))) {
    if (SPACED_BEFORE_PAREN.has(m[1].toUpperCase())) inserts.push(m.index + m[1].length);
  }
  let out = line;
  for (let k = inserts.length - 1; k >= 0; k--) {
    out = out.slice(0, inserts[k]) + " " + out.slice(inserts[k]);
  }
  return out;
}
