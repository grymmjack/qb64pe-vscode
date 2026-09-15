import * as assert from "assert";
import {
  hasLineContinuation,
  identifierAt,
  identifiersIn,
  isInCommentOrString,
  scanLine,
  splitStatements,
  stripComment,
  stripCommentsAndStrings,
} from "../../core/lexer";

describe("core/lexer", () => {
  describe("stripCommentsAndStrings", () => {
    it("blanks strings and comments but keeps length and columns", () => {
      const line = `PRINT "SUB NotASub": x = 1 ' SUB comment`;
      const mask = stripCommentsAndStrings(line);
      assert.strictEqual(mask.length, line.length);
      assert.strictEqual(mask, `PRINT              : x = 1              `);
    });

    it("treats an unterminated string as running to end of line", () => {
      assert.strictEqual(stripCommentsAndStrings(`a = "oops: b = 1`), `a =             `);
    });

    it("recognises REM only at the start of a statement", () => {
      assert.strictEqual(scanLine("REM DIM x AS LONG").commentStart, 0);
      assert.strictEqual(scanLine("  rem lower").commentStart, 2);
      assert.strictEqual(scanLine("x = 1: REM note").commentStart, 7);
      assert.strictEqual(scanLine("REMOVE = 1").commentStart, -1);
      assert.strictEqual(scanLine("y = REM").commentStart, -1);
    });

    it("keeps metacommand lines intact (colons and apostrophes are not separators)", () => {
      for (const line of ["$CONSOLE:ONLY", "'$INCLUDE:'lib.bi'", "  '$DYNAMIC", "$IF WIN THEN"]) {
        const scan = scanLine(line);
        assert.strictEqual(scan.isMetacommand, true, line);
        assert.strictEqual(scan.mask, line);
        assert.deepStrictEqual(scan.colons, []);
        assert.strictEqual(scan.commentStart, -1);
      }
      assert.strictEqual(scanLine("' not a $metacommand").isMetacommand, false);
    });
  });

  describe("stripComment", () => {
    it("removes the comment but keeps string literals", () => {
      assert.strictEqual(stripComment(`CONST T = "it's" ' quote inside`), `CONST T = "it's" `);
    });
  });

  describe("isInCommentOrString", () => {
    const line = `msg = "a b" ' c`;
    it("is true inside strings (including their spaces and quotes)", () => {
      assert.strictEqual(isInCommentOrString(line, 6), true); // opening quote
      assert.strictEqual(isInCommentOrString(line, 8), true); // the space in "a b"
      assert.strictEqual(isInCommentOrString(line, 10), true); // closing quote
    });
    it("is true inside comments and false in code", () => {
      assert.strictEqual(isInCommentOrString(line, 12), true);
      assert.strictEqual(isInCommentOrString(line, 14), true);
      assert.strictEqual(isInCommentOrString(line, 0), false);
      assert.strictEqual(isInCommentOrString(line, 4), false);
    });
  });

  describe("splitStatements", () => {
    it("splits on colons outside strings and comments, with offsets", () => {
      assert.deepStrictEqual(splitStatements("DIM a AS LONG: DIM b AS LONG"), [
        { text: "DIM a AS LONG", start: 0 },
        { text: "DIM b AS LONG", start: 15 },
      ]);
      assert.deepStrictEqual(splitStatements(`PRINT "a:b": x = 1 ' c: d`), [
        { text: `PRINT "a:b"`, start: 0 },
        { text: "x = 1", start: 13 },
      ]);
    });
    it("yields a trailing empty statement for a label line", () => {
      assert.deepStrictEqual(splitStatements("handler:"), [
        { text: "handler", start: 0 },
        { text: "", start: 8 },
      ]);
    });
    it("returns one statement for a plain line", () => {
      assert.deepStrictEqual(splitStatements("  x = 1  "), [{ text: "x = 1", start: 2 }]);
    });
  });

  describe("hasLineContinuation", () => {
    it("detects a trailing underscore outside strings and comments", () => {
      assert.strictEqual(hasLineContinuation("total = first + _"), true);
      assert.strictEqual(hasLineContinuation("SUB Configure (width AS INTEGER, _  "), true);
      assert.strictEqual(hasLineContinuation("        _"), true);
    });
    it("ignores underscores in strings, comments and identifiers", () => {
      assert.strictEqual(hasLineContinuation(`x = "a _"`), false);
      assert.strictEqual(hasLineContinuation("y = 1 ' _"), false);
      assert.strictEqual(hasLineContinuation("foo_"), false);
      assert.strictEqual(hasLineContinuation("z = my_"), false);
    });
  });

  describe("identifierAt", () => {
    const at = (line: string, col: number) => identifierAt(line, col)?.word ?? null;

    it("returns the identifier with its sigil", () => {
      assert.strictEqual(at("title$ = Describe$(3)", 10), "Describe$");
      assert.strictEqual(at("count% = Half%(10)", 2), "count%");
      assert.strictEqual(at("huge&& = 1", 1), "huge&&");
      assert.strictEqual(at("flags~%(4) = 0", 0), "flags~%");
      assert.strictEqual(at("b%% = 1", 0), "b%%");
      assert.strictEqual(at("f## = 1", 0), "f##");
      assert.strictEqual(at("bits` = 1", 0), "bits`");
      assert.strictEqual(at("x = _UNSIGNED", 6), "_UNSIGNED");
    });

    it("returns the full identifier record", () => {
      assert.deepStrictEqual(identifierAt("  PRINT STR$(n%)", 9), {
        word: "STR$",
        start: 8,
        end: 12,
      });
    });

    it("keeps metacommand names whole", () => {
      assert.strictEqual(at("$CONSOLE:ONLY", 0), "$CONSOLE");
      assert.strictEqual(at("$CONSOLE:ONLY", 10), "ONLY");
      assert.strictEqual(at("'$INCLUDE:'lib.bi'", 4), "$INCLUDE");
    });

    it("treats dots as separators (one segment of a member path)", () => {
      assert.strictEqual(at("player.pos.x = 1", 8), "pos");
      assert.strictEqual(at("player.pos.x = 1", 11), "x");
    });

    it("selects the word immediately before the cursor, like VS Code", () => {
      assert.strictEqual(at("x = y", 1), "x"); // cursor right after `x`
      assert.strictEqual(at("x = y", 0), "x");
      assert.strictEqual(at("x = y", 5), "y"); // end of line
      assert.strictEqual(at("x = y", 2), null); // on the `=`
    });

    it("returns null inside comments and strings", () => {
      assert.strictEqual(at(`PRINT "SUB NotASub"`, 9), null);
      assert.strictEqual(at("x = 1 ' DIM hidden", 12), null);
      assert.strictEqual(at("REM DIM hidden", 6), null);
    });
  });

  describe("identifiersIn", () => {
    it("lists code identifiers in order, skipping strings and comments", () => {
      assert.deepStrictEqual(
        identifiersIn(`total& = Add(a%, b%) + LEN("x y") ' z`).map((i) => i.word),
        ["total&", "Add", "a%", "b%", "LEN"]
      );
    });
  });
});
