import * as assert from "assert";
import { splitInlineLabel, splitInlineLabels } from "../../core/labels";

const SUBS = new Set(["cursor_erase", "cursor_draw", "deletesave"]);
const isRoutine = (name: string) => SUBS.has(name.toLowerCase());

describe("core/labels", () => {
  it("moves a label's trailing statement onto its own line", () => {
    assert.deepStrictEqual(splitInlineLabel("    retry: PRINT x ' again", isRoutine), [
      "    retry:",
      "    PRINT x ' again",
    ]);
  });

  it("normalizes the label to `name:`", () => {
    assert.deepStrictEqual(splitInlineLabel("retry : PRINT x", isRoutine), ["retry:", "PRINT x"]);
  });

  it("leaves `Sub1: Sub2` (a no-argument SUB call) alone", () => {
    assert.strictEqual(splitInlineLabel("cursor_erase: cursor_draw", isRoutine), null);
    assert.strictEqual(splitInlineLabel("DeleteSave: x = 1", isRoutine), null);
  });

  it("leaves keywords, lone labels, comments-only tails and metacommands alone", () => {
    for (const line of ['CLS: PRINT "x"', "DO: LOOP", "done:", "done: ' tail", "$CONSOLE:ONLY", 'PRINT "a: b"', "x = 1: y = 2"]) {
      assert.strictEqual(splitInlineLabel(line, isRoutine), null, line);
    }
  });

  it("splits nothing when the caller is unsure", () => {
    assert.strictEqual(splitInlineLabel("retry: PRINT x", () => true), null);
  });

  it("does not split a line that continues a `_` line", () => {
    assert.deepStrictEqual(
      splitInlineLabels(["PRINT a, _", "b: PRINT c", "top: GOTO top"], isRoutine),
      ["PRINT a, _", "b: PRINT c", "top:", "GOTO top"]
    );
  });
});
