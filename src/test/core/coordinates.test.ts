import * as assert from "assert";
import { spaceKeywordParens as s, tightenCoordinateDashes as t } from "../../core/coordinates";

describe("core/coordinates", () => {
  it("tightens the dash between coordinate pairs", () => {
    assert.strictEqual(
      t("LINE (0, centerY) - (screenWidth, centerY), _RGB32(255, 255, 255)"),
      "LINE (0, centerY)-(screenWidth, centerY), _RGB32(255, 255, 255)"
    );
    assert.strictEqual(t("line (a, b) -(c, d), , BF"), "line (a, b)-(c, d), , BF");
    assert.strictEqual(t("VIEW (10, 10) - (100, 100)"), "VIEW (10, 10)-(100, 100)");
    assert.strictEqual(t("WINDOW (0, 0) - (1, 1)"), "WINDOW (0, 0)-(1, 1)");
    assert.strictEqual(
      t("_PUTIMAGE (0, 0) - (9, 9), src, dst, (0, 0) - (4, 4)"),
      "_PUTIMAGE (0, 0)-(9, 9), src, dst, (0, 0)-(4, 4)"
    );
    assert.strictEqual(
      t("_MAPTRIANGLE (0, 0) - (1, 0) - (0, 1), img TO (0, 0) - (2, 0) - (0, 2)"),
      "_MAPTRIANGLE (0, 0)-(1, 0)-(0, 1), img TO (0, 0)-(2, 0)-(0, 2)"
    );
  });

  it("handles STEP and the leading LINE -(x, y) form", () => {
    assert.strictEqual(t("LINE (0, 0) - STEP(5, 5)"), "LINE (0, 0)-STEP(5, 5)");
    assert.strictEqual(t("LINE - (5, 5)"), "LINE -(5, 5)");
  });

  it("works after THEN / ELSE and in later : statements", () => {
    assert.strictEqual(t("IF x THEN LINE (0, 0) - (1, 1)"), "IF x THEN LINE (0, 0)-(1, 1)");
    assert.strictEqual(t("CLS: LINE (0, 0) - (1, 1)"), "CLS: LINE (0, 0)-(1, 1)");
  });

  it("leaves real subtraction alone", () => {
    assert.strictEqual(t("x = (a) - (b)"), "x = (a) - (b)");
    assert.strictEqual(t("LINE (a - b, 0) - (c - 1, d)"), "LINE (a - b, 0)-(c - 1, d)");
    assert.strictEqual(t("LINE (0, 0) - (1, 1), c - 1"), "LINE (0, 0)-(1, 1), c - 1");
    assert.strictEqual(t("LINE INPUT (a) - (b)"), "LINE INPUT (a) - (b)");
  });

  it("ignores strings and comments", () => {
    assert.strictEqual(t("LINE (0, 0) - (1, 1) ' (a) - (b)"), "LINE (0, 0)-(1, 1) ' (a) - (b)");
    assert.strictEqual(t('PRINT "LINE (0, 0) - (1, 1)"'), 'PRINT "LINE (0, 0) - (1, 1)"');
  });
});

describe("core/coordinates spaceKeywordParens", () => {
  it("spaces statements and operators from their parenthesis", () => {
    assert.strictEqual(
      s("LINE(0, centerY)-(w, centerY), _RGB32(255, 255, 255)"),
      "LINE (0, centerY)-(w, centerY), _RGB32(255, 255, 255)"
    );
    assert.strictEqual(s("IF(a > 1) AND(b < 2) THEN PSET(x, y)"), "IF (a > 1) AND (b < 2) THEN PSET (x, y)");
    assert.strictEqual(s("FOR i = 1 TO(n)"), "FOR i = 1 TO (n)");
  });

  it("keeps calls, arrays, STEP and strings tight", () => {
    assert.strictEqual(s("LINE (0, 0)-STEP(5, 5)"), "LINE (0, 0)-STEP(5, 5)");
    assert.strictEqual(s("y = INT(t * f) + grid(1)"), "y = INT(t * f) + grid(1)");
    assert.strictEqual(s('PRINT "LINE(0, 0)"'), 'PRINT "LINE(0, 0)"');
    assert.strictEqual(s("my.line(1) = 2"), "my.line(1) = 2");
  });
});
