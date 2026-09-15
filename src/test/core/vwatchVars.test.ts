import * as assert from "assert";
import {
  parseGlobalSlots,
  parseLocalSlots,
  resolveGlobals,
  resolveLocals,
} from "../../core/vwatchVars";

// The generated-C variable table is what makes live variable inspection
// possible; these tests pin the decoding of the compiler's C names.
describe("core/vwatchVars", () => {
  const globalC = [
    "void *vwatch_global_vars[ 4];",
    "vwatch_global_vars[0] = &__SINGLE_X;",
    "vwatch_global_vars[1] = &__STRING_CH;",
    "vwatch_global_vars[2] = &__ARRAY_SINGLE_BALL;",
    "vwatch_global_vars[3] = &___INTEGER64_BIG;",
  ].join("\n");

  const localC = [
    "void *vwatch_local_vars[ 2];",
    "vwatch_local_vars[0] = &_SUB_GREET_INTEGER_N;",
    "vwatch_local_vars[1] = &_SUB_GREET_STRING_MSG;",
    "vwatch_local_vars[0] = &_SUB_OTHER_LONG_K;",
  ].join("\n");

  it("extracts global slots with their index", () => {
    const slots = parseGlobalSlots(globalC);
    assert.strictEqual(slots.length, 4);
    assert.deepStrictEqual(slots[0], { index: 0, cname: "__SINGLE_X" });
    assert.deepStrictEqual(slots[2], { index: 2, cname: "__ARRAY_SINGLE_BALL" });
  });

  it("resolves global scalars to name/type/size", () => {
    const vars = resolveGlobals(globalC);
    const byName = new Map(vars.map((v) => [v.name, v]));
    assert.deepStrictEqual(byName.get("X"), {
      index: 0,
      name: "X",
      varType: "SINGLE",
      size: 4,
      isArray: false,
    });
    assert.deepStrictEqual(byName.get("CH"), {
      index: 1,
      name: "CH",
      varType: "STRING",
      size: 12,
      isArray: false,
    });
  });

  it("marks arrays and handles underscore-prefixed types", () => {
    const vars = resolveGlobals(globalC);
    const ball = vars.find((v) => v.name === "BALL")!;
    assert.strictEqual(ball.isArray, true);
    assert.strictEqual(ball.varType, "SINGLE");
    const big = vars.find((v) => v.name === "BIG")!;
    assert.strictEqual(big.varType, "_INTEGER64");
    assert.strictEqual(big.size, 8);
  });

  it("resolves only the requested routine's locals", () => {
    const greet = resolveLocals(localC, "SUB_GREET");
    assert.deepStrictEqual(
      greet.map((v) => v.name).sort(),
      ["MSG", "N"]
    );
    const n = greet.find((v) => v.name === "N")!;
    assert.strictEqual(n.index, 0);
    assert.strictEqual(n.varType, "INTEGER");

    const other = resolveLocals(localC, "SUB_OTHER");
    assert.deepStrictEqual(other.map((v) => v.name), ["K"]);
  });

  it("parses local slots regardless of routine", () => {
    assert.strictEqual(parseLocalSlots(localC).length, 3);
  });
});
