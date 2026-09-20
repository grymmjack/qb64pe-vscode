import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { SymbolIndex, createIncludeResolver, diskLoader, normalizePath } from "../../core/index";
import { diagnose } from "../../core/diagnostics";

const FIXTURES = path.resolve(__dirname, "../../../test/fixtures");
const F = (rel: string) => normalizePath(path.join(FIXTURES, rel));
const index = new SymbolIndex(createIncludeResolver([path.join(FIXTURES, "include")]), diskLoader);
for (const f of ["basics.bas", "sigils.bas", "dim_lists.bas", "edge_cases.bas", "include/main.bas"]) {
  index.setFile(F(f), fs.readFileSync(F(f), "utf8"));
}
const V = F("virtual/diag.bas");
const check = (src: string[]) => {
  index.setFile(V, src.join("\n"));
  return diagnose(index, V).map((d) => `${d.range.start.line}:${d.code}:${d.severity}:${d.message}`);
};

describe("core/diagnostics", () => {
  after(() => index.removeFile(V));

  it("produces no false positives on the fixtures (only never-read locals)", () => {
    assert.deepStrictEqual(diagnose(index, F("basics.bas")).map((d) => [d.code, d.message]), [
      ["unused-local", "'initialised' is assigned but never read."],
      ["unused-local", "'i' is declared but never used."],
    ]);
    for (const f of ["sigils.bas", "dim_lists.bas", "edge_cases.bas", "include/main.bas", "include/nested/deep.bm"]) {
      const problems = diagnose(index, F(f)).filter((d) => d.code !== "unused-local");
      assert.deepStrictEqual(problems, [], f);
    }
  });

  it("warns about statement-style calls to undefined SUBs, but not builtins/assignments", () => {
    assert.deepStrictEqual(check([
      "Foo 1, 2",
      "CALL Bar(1)",
      "PRINT \"x\": CLS: LOCATE 1, 1",
      "OPTION _EXPLICIT",
      "x = 1: arr(1) = 2: p.x = 3",
      "Later",
      "InitGame",
      "SUB Later",
      "END SUB",
    ]), [
      "0:undefined-sub:warning:SUB 'Foo' is not defined.",
      "1:undefined-sub:warning:SUB 'Bar' is not defined.",
      "6:undefined-sub:warning:SUB 'InitGame' is not defined.", // basics.bas is not in this file's unit
    ]);
  });

  it("flags GOTO/GOSUB to labels the file does not define", () => {
    assert.deepStrictEqual(check(["GOTO nowhere", "GOSUB here", "GOTO 10", "here:", "10 PRINT"]), [
      "0:undefined-label:error:Label 'nowhere' is not defined in this file.",
    ]);
  });

  it("flags GOTO/GOSUB to a label defined only in another scope", () => {
    // 'done' exists in SUB B, but the GOTO in SUB A cannot reach it. A jump to a
    // label in the same scope (or module level) stays clean.
    assert.deepStrictEqual(
      check([
        "GOTO top",
        "top:",
        "SUB A", "  GOTO done", "END SUB",
        "SUB B", "  done:", "  GOTO done", "END SUB",
      ]).filter((d) => d.includes("undefined-label")),
      ["3:undefined-label:error:Label 'done' is not defined in this scope."]
    );
  });

  it("reports duplicate routines (sigil-insensitive), types, consts and labels", () => {
    assert.deepStrictEqual(check([
      "CONST C = 1", "CONST C = 2",
      "TYPE T", " a AS LONG", "END TYPE", "TYPE T", " b AS LONG", "END TYPE",
      "again:", "again:",
      "SUB A", "END SUB", "SUB A", "END SUB",
      "FUNCTION Add%", "END FUNCTION", "SUB add", "END SUB",
    ]).filter((d) => d.includes("duplicate")), [
      "1:duplicate:error:CONST 'C' is already defined (diag.bas:1).",
      "5:duplicate:error:TYPE 'T' is already defined (diag.bas:3).",
      "9:duplicate:error:Label 'again' is already defined (diag.bas:9).",
      "12:duplicate:error:SUB 'A' is already defined (diag.bas:11).",
      "16:duplicate:error:SUB 'add' is already defined (diag.bas:15).",
    ]);
  });

  it("does not flag a name defined once per exclusive $IF branch", () => {
    // Per-OS CONST: one definition in each mutually exclusive precompiler branch
    // is legal — only one branch is ever compiled.
    assert.deepStrictEqual(
      check([
        "$IF MAC THEN",
        "  CONST P = \"mac\"",
        "$ELSEIF LINUX THEN",
        "  CONST P = \"linux\"",
        "$ELSEIF WIN THEN",
        "  CONST P = \"win\"",
        "$ELSE",
        "  CONST P = \"\"",
        "$END IF",
      ]).filter((d) => d.includes("duplicate")),
      []
    );
  });

  it("still flags a real duplicate within one $IF branch, or one shared with top level", () => {
    // Two definitions in the SAME branch are a duplicate...
    assert.deepStrictEqual(
      check([
        "$IF WIN THEN", "  CONST P = 1", "  CONST P = 2", "$END IF",
      ]).filter((d) => d.includes("duplicate")),
      ["2:duplicate:error:CONST 'P' is already defined (diag.bas:2)."]
    );
    // ...and a top-level definition coexists with every branch, so a branch that
    // redefines it is still flagged.
    assert.deepStrictEqual(
      check([
        "CONST P = 0", "$IF WIN THEN", "  CONST P = 1", "$END IF",
      ]).filter((d) => d.includes("duplicate")),
      ["2:duplicate:error:CONST 'P' is already defined (diag.bas:1)."]
    );
  });

  it("allows the same label name in different scopes, but not within one scope", () => {
    // Same label 'retry' in two different SUBs and at module level: all legal.
    assert.deepStrictEqual(
      check([
        "retry:",
        "SUB A", "  retry:", "  GOTO retry", "END SUB",
        "SUB B", "  retry:", "  GOTO retry", "END SUB",
      ]).filter((d) => d.includes("duplicate")),
      []
    );
    // But repeating a label within the same routine is still a duplicate.
    assert.deepStrictEqual(
      check(["SUB A", "  dup:", "  dup:", "END SUB"]).filter((d) => d.includes("duplicate")),
      ["2:duplicate:error:Label 'dup' is already defined (diag.bas:2)."]
    );
  });

  it("hints about locals that are never read, ignoring parameters and FOR counters", () => {
    assert.deepStrictEqual(check([
      "SUB S (p AS LONG)",
      "  DIM unused AS LONG",
      "  DIM used AS LONG: used = 1: PRINT used",
      "  tmp$ = \"x\"",
      "  DIM i AS LONG: FOR i = 1 TO 3: NEXT",
      "  n = 2: PRINT n",
      "END SUB",
    ]), [
      "1:unused-local:hint:'unused' is declared but never used.",
      "3:unused-local:hint:'tmp$' is assigned but never read.",
    ]);
  });

  it("does not flag TYPE fields, DECLARE LIBRARY prototypes or calls into includes", () => {
    const deep = diagnose(index, F("include/nested/deep.bm")).filter((d) => d.code === "undefined-sub");
    assert.deepStrictEqual(deep, []); // `UtilHelper seed` is defined in util.bm
    assert.deepStrictEqual(check(["TYPE V", "  x AS SINGLE", "END TYPE", "DECLARE LIBRARY", "  SUB Ext (BYVAL a AS LONG)", "END DECLARE", "Ext 1"]), []);
  });

  it("flags an $INCLUDE whose file cannot be resolved", () => {
    const missing = check(["'$INCLUDE:'does_not_exist.bi'"]).filter((d) =>
      d.includes("missing-include")
    );
    assert.strictEqual(missing.length, 1);
    assert.ok(missing[0].startsWith("0:missing-include:warning:"));
    assert.ok(missing[0].includes("does_not_exist.bi"));
  });
});
