import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { foldingRanges } from "../../core/folding";

const FIXTURES = path.resolve(__dirname, "../../../test/fixtures");
const linesOf = (rel: string) => fs.readFileSync(path.join(FIXTURES, rel), "utf8").split(/\r?\n/);
const find = (lines: string[], needle: string) => lines.findIndex((l) => l.includes(needle));
const plain = (lines: string[]) => foldingRanges(lines).filter((r) => !r.kind).map((r) => [r.startLine, r.endLine]);

describe("core/folding", () => {
  it("folds routines and TYPEs, leaving the END line visible", () => {
    const lines = linesOf("basics.bas");
    const ranges = plain(lines);
    assert.ok(ranges.some(([s, e]) => s === find(lines, "TYPE Vec2") && e === find(lines, "END TYPE") - 1));
    assert.ok(ranges.some(([s, e]) => s === find(lines, "SUB InitGame") && e === find(lines, "END SUB") - 1));
    assert.ok(ranges.some(([s]) => s === find(lines, "FUNCTION Add")));
  });

  it("folds comment blocks of two or more lines", () => {
    const lines = linesOf("basics.bas");
    const comments = foldingRanges(lines).filter((r) => r.kind === "comment").map((r) => [r.startLine, r.endLine]);
    assert.deepStrictEqual(comments[0], [0, 1]);
    const doc = find(lines, "' Adds two integers.");
    assert.ok(comments.some(([s, e]) => s === doc && e === doc + 2));
    assert.ok(!comments.some(([s, e]) => s === e), "single comment lines do not fold");
  });

  it("ignores single-line IF, folds continued headers from their first line, skips DECLARE prototypes", () => {
    const lines = linesOf("edge_cases.bas");
    const ranges = plain(lines);
    assert.ok(ranges.some(([s, e]) => s === find(lines, "SUB Configure") && e === find(lines, "END SUB") - 1));
    assert.ok(!ranges.some(([s]) => s === find(lines, "IF first > 0 THEN second = 1")));
    const declare = find(lines, 'DECLARE LIBRARY "fastmath"');
    assert.ok(ranges.some(([s, e]) => s === declare && e === declare + 2));
    assert.ok(!ranges.some(([s]) => s === find(lines, "FUNCTION Fast_Sqrt&")), "prototype has no body");
  });

  it("handles nested loops, SELECT, block IF, WHILE, $IF and NEXT with two counters", () => {
    const src = [
      "$IF WIN THEN",          // 0
      "  CONST OS = 1",
      "$END IF",               // 2
      "FOR i = 1 TO 3",        // 3
      "  FOR j = 1 TO 3",      // 4
      "    IF i = j THEN",     // 5
      "      PRINT i",
      "    END IF",            // 7
      "NEXT j, i",             // 8
      "DO WHILE x < 1: x = x + 1",   // 9
      "  SELECT CASE x",       // 10
      "    CASE 1: PRINT \"LOOP\"",
      "  END SELECT",          // 12
      "LOOP",                  // 13
      "WHILE y < 2: y = y + 1",// 14
      "WEND",                  // 15
      "FOR k = 1 TO 3: NEXT",  // 16 - one line, nothing to fold
    ];
    // WHILE (14) … WEND (15) has no body line between them, so no range.
    assert.deepStrictEqual(plain(src), [
      [0, 1], [3, 7], [4, 7], [5, 6], [9, 12], [10, 11],
    ]);
  });

  it("drops unclosed blocks instead of folding to the end of the file", () => {
    assert.deepStrictEqual(plain(["SUB A", "  x = 1", "  y = 2"]), []);
    assert.deepStrictEqual(plain(["DO", "  x = 1", "LOOP", "IF a THEN"]), [[0, 1]]);
  });
});
