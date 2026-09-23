import * as assert from "assert";
import { align } from "../../core/align";

// Convenience: run a single pass by disabling the others.
const only = (over: Partial<Parameters<typeof align>[1]>) => ({
  assignments: false,
  declarations: false,
  case: false,
  colons: false,
  comments: false,
  ...over,
});

describe("core/align", () => {
  it("aligns '=' within a consecutive assignment block", () => {
    const src = ["x = 1", "yy = 2", "zzz = 3"].join("\n");
    assert.strictEqual(
      align(src, only({ assignments: true })),
      ["x   = 1", "yy  = 2", "zzz = 3"].join("\n")
    );
  });

  it("does not align '=' across comparisons or compound assignments", () => {
    const src = ["n = 1", "IF n = 2 THEN PRINT", "n = n + 1", "m = 3"].join("\n");
    // The IF (comparison) and the n = n + 1 (compound) break the run, so the
    // two plain assignments each stay in their own single-line group.
    assert.strictEqual(align(src, only({ assignments: true })), src);
  });

  it("does not treat '=' inside a string as an assignment", () => {
    const src = 'PRINT "a = b"';
    assert.strictEqual(align(src, only({ assignments: true })), src);
  });

  it("aligns 'AS' within a TYPE block (block scope)", () => {
    const src = ["TYPE Player", "  x AS LONG", "  name AS STRING", "END TYPE"].join("\n");
    assert.strictEqual(
      align(src, only({ declarations: true, scope: "block" })),
      ["TYPE Player", "  x    AS LONG", "  name AS STRING", "END TYPE"].join("\n")
    );
  });

  it("does not align 'AS' in a parameter list or OPEN statement", () => {
    const src = ["SUB Foo (a AS LONG)", "OPEN f$ FOR INPUT AS #1"].join("\n");
    assert.strictEqual(align(src, only({ declarations: true })), src);
  });

  it("aligns inline comments to a shared column", () => {
    const src = ["x = 1 ' one", "yyy = 2 ' two"].join("\n");
    assert.strictEqual(
      align(src, only({ comments: true, scope: "block" })),
      ["x = 1 ' one", "yyy = 2 ' two"].join("\n").replace("x = 1 '", "x = 1   '")
    );
  });

  it("ignores apostrophes inside strings when aligning comments", () => {
    const src = ['PRINT "it\'s fine"', "x = 1 ' c"].join("\n");
    // The string line has no real inline comment, so it never joins the group.
    const out = align(src, only({ comments: true }));
    assert.ok(out.startsWith('PRINT "it\'s fine"'));
  });

  it("aligns CASE \"KEY\": assignments in two columns", () => {
    const src = [
      'CASE "a": color = 1',
      'CASE "bbb": background = 2',
    ].join("\n");
    assert.strictEqual(
      align(src, only({ case: true })),
      [
        'CASE "a":   color      = 1',
        'CASE "bbb": background = 2',
      ].join("\n")
    );
  });

  it("aligns ':' statement separators within a group", () => {
    const src = ["a = 1: b = 2", "cc = 3: d = 4"].join("\n");
    assert.strictEqual(
      align(src, only({ colons: true })),
      ["a = 1  : b = 2", "cc = 3 : d = 4"].join("\n") // colons align to the same column
    );
  });

  it("leaves already-aligned source unchanged (idempotent)", () => {
    const src = [
      "TYPE T",
      "  a    AS LONG",
      "  name AS STRING",
      "END TYPE",
      "",
      "x   = 1",
      "yyy = 2",
    ].join("\n");
    assert.strictEqual(align(src), align(align(src)));
  });

  it("preserves CRLF line endings", () => {
    const src = "x = 1\r\nyy = 2";
    assert.ok(align(src, only({ assignments: true })).includes("\r\n"));
  });

  it("puts labels on their own line when given isRoutine, but not `Sub1: Sub2`", () => {
    const src = ["retry: PRINT x", "cursor_erase: cursor_draw"].join("\n");
    const isRoutine = (n: string) => /^cursor_/i.test(n);
    assert.strictEqual(
      align(src, only({ isRoutine })),
      ["retry:", "PRINT x", "cursor_erase: cursor_draw"].join("\n")
    );
    assert.strictEqual(align(src, only({})), src); // no isRoutine: never split
  });
});
