import * as assert from "assert";
import { reindent } from "../../core/indent";

const fmt = (src: string[]) => reindent(src.join("\n"), "  ").split("\n");
const fmtOpt = (src: string[], unit: string, opts: any) =>
  reindent(src.join("\n"), unit, opts).split("\n");

describe("core/indent", () => {
  it("indents SUB / FOR / IF blocks", () => {
    assert.deepStrictEqual(
      fmt([
        "SUB Greet",
        "FOR i = 1 TO 10",
        "IF i > 5 THEN",
        "PRINT i",
        "END IF",
        "NEXT i",
        "END SUB",
      ]),
      [
        "SUB Greet",
        "  FOR i = 1 TO 10",
        "    IF i > 5 THEN",
        "      PRINT i",
        "    END IF",
        "  NEXT i",
        "END SUB",
      ]
    );
  });

  it("renders ELSE/ELSEIF one level out and re-indents the body", () => {
    assert.deepStrictEqual(
      fmt(["IF a THEN", "x = 1", "ELSEIF b THEN", "x = 2", "ELSE", "x = 3", "END IF"]),
      ["IF a THEN", "  x = 1", "ELSEIF b THEN", "  x = 2", "ELSE", "  x = 3", "END IF"]
    );
  });

  it("leaves a single-line IF alone (no nesting)", () => {
    assert.deepStrictEqual(
      fmt(["SUB S", "IF x THEN PRINT 1", "y = 2", "END SUB"]),
      ["SUB S", "  IF x THEN PRINT 1", "  y = 2", "END SUB"]
    );
  });

  it("handles SELECT CASE with nested bodies", () => {
    assert.deepStrictEqual(
      fmt([
        "SELECT CASE x",
        "CASE 1",
        "foo",
        "CASE 2",
        "bar",
        "END SELECT",
      ]),
      [
        "SELECT CASE x",
        "  CASE 1",
        "    foo",
        "  CASE 2",
        "    bar",
        "END SELECT",
      ]
    );
  });

  it("does not count keywords inside strings or comments", () => {
    assert.deepStrictEqual(
      fmt(["SUB S", 'PRINT "END SUB"', "x = 1 ' NEXT", "END SUB"]),
      ["SUB S", '  PRINT "END SUB"', "  x = 1 ' NEXT", "END SUB"]
    );
  });

  it("indents continuation lines and DO/WHILE/TYPE blocks", () => {
    assert.deepStrictEqual(
      fmt([
        "TYPE T",
        "x AS INTEGER",
        "END TYPE",
        "DO",
        "total = a + _",
        "b",
        "LOOP",
        "WHILE running",
        "tick",
        "WEND",
      ]),
      [
        "TYPE T",
        "  x AS INTEGER",
        "END TYPE",
        "DO",
        "  total = a + _",
        "    b",
        "LOOP",
        "WHILE running",
        "  tick",
        "WEND",
      ]
    );
  });

  it("indents $IF metacommand blocks", () => {
    assert.deepStrictEqual(
      fmt(["$IF WIN THEN", "CONST SLASH = 92", "$END IF"]),
      ["$IF WIN THEN", "  CONST SLASH = 92", "$END IF"]
    );
  });

  it("keeps SUB/FUNCTION bodies flush when indentSubs is off (but nests inside)", () => {
    assert.deepStrictEqual(
      fmtOpt(["SUB S", "IF x THEN", "y = 1", "END IF", "END SUB"], "  ", { indentSubs: false }),
      ["SUB S", "IF x THEN", "  y = 1", "END IF", "END SUB"]
    );
  });

  it("honors a custom indent unit (e.g. 4 spaces)", () => {
    assert.deepStrictEqual(
      fmtOpt(["SUB S", "x = 1", "END SUB"], "    ", {}),
      ["SUB S", "    x = 1", "END SUB"]
    );
  });

  it("ignores inline FOR...NEXT and blank lines", () => {
    assert.deepStrictEqual(
      fmt(["SUB S", "", "FOR i = 1 TO 3: PRINT i: NEXT i", "END SUB"]),
      ["SUB S", "", "  FOR i = 1 TO 3: PRINT i: NEXT i", "END SUB"]
    );
  });

  it("opens a block from a colon-joined statement (DIM i: FOR ...)", () => {
    // a740g's report: the FOR after the colon must still nest the body.
    assert.deepStrictEqual(
      fmt([
        "SUB S",
        "DIM i AS LONG: FOR i = 5 TO 0 STEP -1",
        "PRINT i",
        "j = j + w",
        "NEXT i",
        "END SUB",
      ]),
      [
        "SUB S",
        "  DIM i AS LONG: FOR i = 5 TO 0 STEP -1",
        "    PRINT i",
        "    j = j + w",
        "  NEXT i",
        "END SUB",
      ]
    );
  });
});
