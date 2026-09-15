import * as assert from "assert";
import { parseContent } from "../../core/parser";
import { declarationLabel, kindLabel, signatureLabel, symbolMarkdown } from "../../core/format";

describe("core/format", () => {
  const symbols = parseContent(
    [
      "' Adds two numbers",
      "FUNCTION Add% (a AS INTEGER, BYVAL b AS INTEGER)",
      "END FUNCTION",
      "SUB Greet",
      "END SUB",
      "TYPE Vec2",
      "  x AS SINGLE",
      "END TYPE",
      "DIM SHARED grid(10) AS Vec2",
      "CONST PI = 3.14",
      "total& = 1",
      'DECLARE LIBRARY "m"',
      "  FUNCTION fsqrt! (BYVAL v AS SINGLE)",
      "END DECLARE",
    ].join("\n"),
    "/tmp/x.bas"
  );
  const by = (n: string) => symbols.find((s) => s.name === n)!;

  it("renders signatures and declarations", () => {
    assert.strictEqual(signatureLabel(by("Add%")), "FUNCTION Add% (a AS INTEGER, BYVAL b AS INTEGER)  ' returns INTEGER");
    assert.strictEqual(signatureLabel(by("Greet")), "SUB Greet");
    assert.strictEqual(declarationLabel(by("grid")), "DIM SHARED grid() AS Vec2");
    assert.strictEqual(declarationLabel(by("PI")), "CONST PI = 3.14");
    assert.strictEqual(declarationLabel(by("total&")), "total& AS LONG");
    assert.strictEqual(declarationLabel(by("Vec2").members[0]), "Vec2.x AS SINGLE");
  });

  it("labels kinds", () => {
    assert.strictEqual(kindLabel(by("grid")), "shared variable");
    assert.strictEqual(kindLabel(by("total&")), "variable");
    assert.strictEqual(kindLabel(by("fsqrt!")), "external function");
  });

  it("builds markdown with docs, parameters, members and location", () => {
    const md = symbolMarkdown(by("Add%"));
    assert.ok(md.startsWith("```QB64PE\nFUNCTION Add%"));
    assert.ok(md.includes("Adds two numbers"));
    assert.ok(md.includes("`BYVAL b AS INTEGER` — by value"));
    assert.ok(md.includes("**Returns** INTEGER"));
    assert.ok(md.endsWith("*x.bas:2*"));
    assert.ok(symbolMarkdown(by("Vec2")).includes("**Members**\n- `x AS SINGLE`"));
    assert.ok(symbolMarkdown(by("fsqrt!")).includes('DECLARE LIBRARY "m"'));
  });
});
