import * as assert from "assert";
import { KEYWORDS, isKeyword } from "../../core/keywords";

describe("core/keywords", () => {
  it("knows classic statements and QB64PE underscore names", () => {
    assert.ok(KEYWORDS.length > 400);
    for (const k of ["PRINT", "print", "CLS", "LOCATE", "DIM", "STR$", "MID$", "_DISPLAY", "_NEWIMAGE", "_RGB32", "LEN", "INKEY$", "TIMER"]) {
      assert.ok(isKeyword(k), k);
    }
  });
  it("treats any underscore-prefixed name as reserved and user names as not keywords", () => {
    assert.ok(isKeyword("_Whatever"));
    for (const k of ["InitGame", "DrawSpike", "count%", "Describe$", "player"]) {
      assert.ok(!isKeyword(k), k);
    }
  });
});
