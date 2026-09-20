import * as assert from "assert";
import { branchPaths, condExclusive } from "../../core/condCompile";

const pathsOf = (src: string) => branchPaths(src.split("\n"));

describe("core/condCompile", () => {
  it("assigns each branch of an $IF construct a distinct index", () => {
    const p = pathsOf([
      "$IF MAC THEN", //        0
      "  CONST P = 1", //       1  branch 0
      "$ELSEIF LINUX THEN", //  2
      "  CONST P = 2", //       3  branch 1
      "$ELSE", //               4
      "  CONST P = 3", //       5  branch 2
      "$END IF", //             6
      "CONST Q = 4", //         7  no construct
    ].join("\n"));
    assert.deepStrictEqual([...p[1]], [[0, 0]]);
    assert.deepStrictEqual([...p[3]], [[0, 1]]);
    assert.deepStrictEqual([...p[5]], [[0, 2]]);
    assert.deepStrictEqual([...p[7]], []);
  });

  it("treats different branches of one construct as mutually exclusive", () => {
    const p = pathsOf("$IF WIN THEN\nA\n$ELSE\nB\n$END IF");
    assert.strictEqual(condExclusive(p[1], p[3]), true); // then vs else
    assert.strictEqual(condExclusive(p[1], p[1]), false); // same branch
  });

  it("does not treat top-level vs in-branch as exclusive (they coexist)", () => {
    const p = pathsOf("TOP\n$IF WIN THEN\nIN\n$END IF");
    assert.strictEqual(condExclusive(p[0], p[2]), false);
  });

  it("handles nesting and comment-style / indented metacommands", () => {
    const p = pathsOf([
      "  '$IF WIN THEN", //   0  (indented, comment-style)
      "    $IF DEV THEN", //  1
      "      X", //           2  outer b0, inner b0
      "    $ELSE", //         3
      "      Y", //           4  outer b0, inner b1
      "    $END IF", //       5
      "  '$ELSE", //          6
      "    Z", //             7  outer b1
      "  '$END IF", //        8
    ].join("\n"));
    assert.deepStrictEqual([...p[2]], [[0, 0], [1, 0]]);
    assert.deepStrictEqual([...p[4]], [[0, 0], [1, 1]]);
    assert.deepStrictEqual([...p[7]], [[0, 1]]);
    assert.strictEqual(condExclusive(p[2], p[4]), true); // differ on inner
    assert.strictEqual(condExclusive(p[2], p[7]), true); // differ on outer
  });

  it("tolerates an unbalanced $END IF without throwing", () => {
    const p = pathsOf("$END IF\nA\n$IF X THEN\nB");
    assert.deepStrictEqual([...p[1]], []);
    assert.deepStrictEqual([...p[3]], [[2, 0]]);
  });
});
