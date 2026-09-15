import * as assert from "assert";
import {
  hitConditionMet,
  parseCondition,
  compareValues,
} from "../../core/vwatchConditions";

describe("core/vwatchConditions", () => {
  describe("hitConditionMet", () => {
    it("bare number means the Nth hit", () => {
      assert.strictEqual(hitConditionMet("3", 2), false);
      assert.strictEqual(hitConditionMet("3", 3), true);
      assert.strictEqual(hitConditionMet("3", 4), false);
    });
    it("supports comparisons and modulo", () => {
      assert.strictEqual(hitConditionMet(">2", 3), true);
      assert.strictEqual(hitConditionMet(">=2", 2), true);
      assert.strictEqual(hitConditionMet("<2", 1), true);
      assert.strictEqual(hitConditionMet("%3", 6), true);
      assert.strictEqual(hitConditionMet("%3", 5), false);
    });
    it("does not suppress on an unparseable condition", () => {
      assert.strictEqual(hitConditionMet("nonsense", 1), true);
    });
  });

  describe("parseCondition", () => {
    it("splits variable, operator and literal", () => {
      assert.deepStrictEqual(parseCondition("x > 5"), {
        name: "x",
        op: ">",
        rhs: "5",
      });
      assert.deepStrictEqual(parseCondition("count% = 10"), {
        name: "count%",
        op: "=",
        rhs: "10",
      });
      assert.deepStrictEqual(parseCondition('name$ <> "hi"'), {
        name: "name$",
        op: "<>",
        rhs: '"hi"',
      });
    });
    it("returns null for expressions it cannot handle", () => {
      assert.strictEqual(parseCondition("a + b > c"), null);
    });
  });

  describe("compareValues", () => {
    it("compares numbers", () => {
      assert.strictEqual(compareValues("7", ">", "5"), true);
      assert.strictEqual(compareValues("5", ">=", "5"), true);
      assert.strictEqual(compareValues("4", "=", "5"), false);
      assert.strictEqual(compareValues("5", "<>", "5"), false);
      assert.strictEqual(compareValues("3.5", "<", "4"), true);
    });
    it("compares quoted strings", () => {
      assert.strictEqual(compareValues("Rick", "=", '"Rick"'), true);
      assert.strictEqual(compareValues("Rick", "<>", '"Bob"'), true);
    });
  });
});
