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
