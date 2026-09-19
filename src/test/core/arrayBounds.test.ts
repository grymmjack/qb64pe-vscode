import * as assert from "assert";
import { parseArrayBounds, optionBase } from "../../core/arrayBounds";

describe("core/arrayBounds", () => {
  it("parses a single upper bound with the option base as lower", () => {
    assert.deepStrictEqual(parseArrayBounds("DIM colW(10)", "colW", 0), { lower: 0, upper: 10 });
    assert.deepStrictEqual(parseArrayBounds("DIM colW(10)", "colW", 1), { lower: 1, upper: 10 });
  });

  it("parses an explicit lo TO hi range", () => {
    assert.deepStrictEqual(parseArrayBounds("DIM board(1 TO 8)", "board", 0), { lower: 1, upper: 8 });
    assert.deepStrictEqual(parseArrayBounds("REDIM x(-5 TO 5)", "x", 0), { lower: -5, upper: 5 });
  });

  it("handles SHARED, type sigils and AS clauses", () => {
    assert.deepStrictEqual(parseArrayBounds("DIM SHARED colW%(10)", "colW", 0), { lower: 0, upper: 10 });
    assert.deepStrictEqual(parseArrayBounds("DIM scores(3) AS LONG", "scores", 0), { lower: 0, upper: 3 });
  });

  it("finds the right array among several on one line", () => {
    assert.deepStrictEqual(parseArrayBounds("DIM a(4), b(9)", "b", 0), { lower: 0, upper: 9 });
  });

  it("returns null for multi-dimensional arrays", () => {
    assert.strictEqual(parseArrayBounds("DIM grid(1 TO 8, 1 TO 8)", "grid", 0), null);
  });

  it("returns null for non-literal (dynamic) bounds", () => {
    assert.strictEqual(parseArrayBounds("REDIM colW(n)", "colW", 0), null);
    assert.strictEqual(parseArrayBounds("REDIM colW(n * 2)", "colW", 0), null);
  });

  it("returns null when the line is not a declaration or lacks the array", () => {
    assert.strictEqual(parseArrayBounds("colW(3) = 5", "colW", 0), null);
    assert.strictEqual(parseArrayBounds("DIM other(3)", "colW", 0), null);
  });

  it("detects OPTION BASE 1", () => {
    assert.strictEqual(optionBase("OPTION BASE 1\nDIM a(3)"), 1);
    assert.strictEqual(optionBase("DIM a(3)"), 0);
    assert.strictEqual(optionBase("  option base 1"), 1);
  });
});
