import * as assert from "assert";
import { ExprEnv, ExprError, Value, evaluateExpression, formatResult } from "../../core/vwatchExpr";

/** A fake debuggee: scalars by upper-case name, arrays as nested lookups. */
function env(vars: Record<string, Value>, arrays: Record<string, (i: number[]) => Value> = {}): ExprEnv {
  return {
    isArray: (n) => n.toUpperCase() in arrays,
    element: async (n, i) => arrays[n.toUpperCase()](i),
    value: async (n) => {
      const k = n.replace(/[%&!#$~`]+$/, "").toUpperCase();
      if (!(k in vars)) throw new ExprError(`${n} not in scope`);
      return vars[k];
    },
  };
}

const ev = (src: string, e: ExprEnv = env({})) => evaluateExpression(src, e);

describe("core/vwatchExpr", () => {
  it("evaluates the watch from the bug report", async () => {
    const e = env({ T: 0.00125, F: 440 });
    // t * f = 0.55 → frac 0.55
    assert.strictEqual(formatResult(await ev("(t * f) - INT(t * f)", e)), "0.55");
    assert.strictEqual(await ev("(t * f) - INT(t * f) < duty_cycle", env({ T: 0.00125, F: 440, DUTY_CYCLE: 0.3 })), 0);
  });

  it("follows QB64 precedence", async () => {
    assert.strictEqual(await ev("-2 ^ 2"), -4);
    assert.strictEqual(await ev("2 ^ 3 ^ 2"), 64);
    assert.strictEqual(await ev("1 + 2 * 3"), 7);
    assert.strictEqual(await ev("7 \\ 2 * 2"), 1); // * binds tighter than \ : 7 \ 4
    assert.strictEqual(await ev("10 MOD 4 + 1"), 3);
    assert.strictEqual(await ev("NOT 1 = 2"), -1);
    assert.strictEqual(await ev("1 < 2 AND 3 > 2"), -1);
  });

  it("rounds operands of \\ and MOD and yields -1/0 for logic", async () => {
    assert.strictEqual(await ev("7.6 \\ 2"), 4);
    assert.strictEqual(await ev("-7 MOD 3"), -1);
    assert.strictEqual(await ev("&HFF AND &H0F"), 15);
    assert.strictEqual(await ev("NOT 0"), -1);
    assert.strictEqual(await ev("5 XOR 3"), 6);
  });

  it("reads variables, sigils, arrays and built-ins", async () => {
    const e = env({ X: 3, NAME: "Ada" }, { GRID: ([i, j]) => i * 10 + j });
    assert.strictEqual(await ev("x% * 2", e), 6);
    assert.strictEqual(await ev("grid(x + 1, 2)", e), 42);
    assert.strictEqual(await ev("LEN(name$) + ASC(name$)", e), 68);
    assert.strictEqual(await ev('LEFT$(name$, 2) + "!"', e), "Ad!");
    assert.strictEqual(await ev("_RED32(_RGB32(1, 2, 3))"), 1);
    assert.strictEqual(formatResult(await ev("_PI")), "3.14159265358979");
    assert.strictEqual(await ev("STR$(5)"), " 5");
    assert.strictEqual(await ev("CINT(2.5) + CINT(3.5)"), 6);
    assert.strictEqual(await ev("1.5E2 + 1D1 + 2#"), 162);
  });

  it("reports errors", async () => {
    await assert.rejects(ev("nope + 1"), /not in scope/);
    await assert.rejects(ev("myFunc(1)"), /cannot call/);
    await assert.rejects(ev("1 / 0"), /division by zero/);
    await assert.rejects(ev('1 + "a"'), /type mismatch/);
    await assert.rejects(ev("(1 + 2"), /expected/);
    await assert.rejects(ev("1 2"), /unexpected/);
  });

  it("formats results like the Variables view", () => {
    assert.strictEqual(formatResult(0.1 + 0.2), "0.3");
    assert.strictEqual(formatResult(440), "440");
    assert.strictEqual(formatResult("hi"), '"hi"');
  });
});
