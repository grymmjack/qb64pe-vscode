import * as assert from "assert";
import { parseContent } from "../../core/parser";

// Smoke test for the vscode-free parsing core. The exhaustive fixture-based
// tests live alongside test/fixtures (see P0.2 in the plan); this one proves
// the mocha harness runs against tsc output and the extraction kept behaviour.
describe("core/parser", () => {
  const source = [
    "' Adds two numbers",
    "' @param a first operand",
    "' @param b second operand",
    "FUNCTION Add (a AS INTEGER, b AS INTEGER)",
    "  Add = a + b",
    "END FUNCTION",
    "",
    "SUB Greet (name AS STRING)",
    "  PRINT name",
    "END SUB",
    "",
    "TYPE Vec2",
    "  x AS SINGLE",
    "  y AS SINGLE",
    "END TYPE",
    "",
    "CONST PI = 3.14159",
    "DIM SHARED score AS LONG",
    "DIM items(10) AS Vec2",
  ].join("\n");

  const symbols = parseContent(source, "test.bas");
  const byName = (name: string) =>
    symbols.find((s) => s.name.toLowerCase() === name.toLowerCase());

  it("tags every symbol with the file it came from", () => {
    assert.ok(symbols.length > 0);
    assert.ok(symbols.every((s) => s.file === "test.bas"));
  });

  it("parses a FUNCTION with parameters and doc comments", () => {
    const add = byName("Add");
    assert.ok(add, "Add should be found");
    assert.strictEqual(add.type, "FUNCTION");
    assert.strictEqual(add.line, 3);
    assert.strictEqual(add.documentation, "Adds two numbers");
    assert.deepStrictEqual(
      add.parameters.map((p) => [p.name, p.type, p.description]),
      [
        ["a", "INTEGER", "first operand"],
        ["b", "INTEGER", "second operand"],
      ]
    );
  });

  it("parses a SUB", () => {
    const greet = byName("Greet");
    assert.ok(greet, "Greet should be found");
    assert.strictEqual(greet.type, "SUB");
    assert.strictEqual(greet.scope, "MODULE");
    assert.strictEqual(greet.parameters.length, 1);
    assert.strictEqual(greet.parameters[0].byRef, true);
  });

  it("parses a TYPE", () => {
    const vec = byName("Vec2");
    assert.ok(vec, "Vec2 should be found");
    assert.strictEqual(vec.type, "TYPE");
  });

  it("parses a CONST with its value", () => {
    const pi = byName("PI");
    assert.ok(pi, "PI should be found");
    assert.strictEqual(pi.type, "CONST");
    assert.strictEqual(pi.value, "3.14159");
  });

  it("parses DIM statements with SHARED and array flags", () => {
    const score = byName("score");
    assert.ok(score, "score should be found");
    assert.strictEqual(score.type, "VARIABLE");
    assert.strictEqual(score.dataType, "LONG");
    assert.strictEqual(score.isShared, true);
    assert.strictEqual(score.scope, "GLOBAL");

    const items = byName("items");
    assert.ok(items, "items should be found");
    assert.strictEqual(items.isArray, true);
    assert.strictEqual(items.dataType, "Vec2");
    assert.strictEqual(items.scope, "MODULE");
  });
});

describe("core/parser: statements and implicit declarations", () => {
  const parse = (src: string[]) => parseContent(src.join("\n"), "t.bas");

  it("parses CONST lists, keeping commas inside strings and parens", () => {
    const symbols = parse(['CONST A = 1, B = "x,y", C = MAX(1, 2)']);
    assert.deepStrictEqual(
      symbols.map((s) => [s.name, s.value]),
      [["A", "1"], ["B", '"x,y"'], ["C", "MAX(1, 2)"]]
    );
  });

  it("records numeric line numbers as labels and still parses the statement", () => {
    const symbols = parse(['10 DIM a AS LONG', '20 PRINT a']);
    assert.deepStrictEqual(symbols.map((s) => [s.type, s.name]), [
      ["LABEL", "10"], ["VARIABLE", "a"], ["LABEL", "20"],
    ]);
  });

  it("does not mistake `CLS: PRINT` or `DO:` for labels", () => {
    const symbols = parse(['CLS: PRINT "x"', 'DO: LOOP UNTIL INKEY$ <> ""', 'again:']);
    assert.deepStrictEqual(symbols.map((s) => s.name), ["again"]);
  });

  it("creates implicit variables from first assignment and FOR, once", () => {
    const symbols = parse([
      "score = 5",
      "score = score + 1",
      "FOR k = 1 TO 3: NEXT",
      "LET total& = 9",
      "SUB Bump (amount)",
      "  amount = amount + 1",
      "  temp$ = STR$(amount)",
      "END SUB",
    ]);
    assert.deepStrictEqual(
      symbols.filter((s) => s.type === "VARIABLE").map((s) => [s.name, s.scope, s.isImplicit, s.dataType]),
      [
        ["score", "MODULE", true, undefined],
        ["k", "MODULE", true, undefined],
        ["total&", "MODULE", true, "LONG"],
        ["temp$", "LOCAL", true, "STRING"],
      ]
    );
  });

  it("accepts CRLF line endings and continuation across them", () => {
    const symbols = parseContent("SUB A (x, _\r\n  y)\r\nEND SUB\r\n", "t.bas");
    assert.deepStrictEqual(symbols[0].parameters.map((p) => p.name), ["x", "y"]);
  });

  it("handles ALIAS in DECLARE LIBRARY and ignores forward DECLAREs", () => {
    const symbols = parse([
      "DECLARE SUB Old (a)",
      'DECLARE DYNAMIC LIBRARY "kernel32"',
      '  FUNCTION GetTick~& ALIAS "GetTickCount" ()',
      "END DECLARE",
    ]);
    assert.deepStrictEqual(symbols.map((s) => [s.name, s.type, s.library]), [
      ["GetTick~&", "FUNCTION", "kernel32"],
    ]);
  });
});
