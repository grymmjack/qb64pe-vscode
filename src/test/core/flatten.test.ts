import * as assert from "assert";
import { flatten, buildReverseMap, FlattenIO } from "../../core/flatten";

// A tiny in-memory filesystem for the flattener tests.
function io(files: Record<string, string>): FlattenIO {
  return {
    readFile: (p) => (p in files ? files[p] : null),
    resolve: (spec, from) => {
      // resolve relative to the including file's directory
      const dir = from.slice(0, from.lastIndexOf("/") + 1);
      const cand = spec.startsWith("/") ? spec : dir + spec;
      return cand in files ? cand : null;
    },
  };
}

describe("core/flatten", () => {
  it("inlines an include and maps every line to its origin", () => {
    const files = {
      "/p/main.bas": ["X = 1", "'$INCLUDE:'lib.bm'", "PRINT X"].join("\n"),
      "/p/lib.bm": ["SUB Hi", "  PRINT 1", "END SUB"].join("\n"),
    };
    const { text, origins } = flatten("/p/main.bas", io(files));
    const lines = text.split("\n");
    // main line 1, neutralized directive, 3 include lines, main line 3
    assert.strictEqual(lines[0], "X = 1");
    assert.ok(lines[1].startsWith("' [flattened $INCLUDE]"));
    assert.strictEqual(lines[2], "SUB Hi");
    assert.strictEqual(lines[5], "PRINT X");

    // origins: flat line 3 (index 2) is lib.bm line 1; flat line 6 is main line 3
    assert.deepStrictEqual(origins[2], { file: "/p/lib.bm", line: 1 });
    assert.deepStrictEqual(origins[5], { file: "/p/main.bas", line: 3 });
  });

  it("never emits the $INCLUDE directive verbatim", () => {
    const files = {
      "/p/main.bas": "'$INCLUDE:'lib.bm'",
      "/p/lib.bm": "PRINT 1",
    };
    const { text } = flatten("/p/main.bas", io(files));
    assert.ok(!/^\s*'?\$INCLUDE\s*:/im.test(text.replace(/\[flattened \$INCLUDE\]/g, "")));
  });

  it("honors $INCLUDEONCE across multiple includes", () => {
    const files = {
      "/p/main.bas": ["'$INCLUDE:'once.bi'", "'$INCLUDE:'once.bi'"].join("\n"),
      "/p/once.bi": ["$INCLUDEONCE", "CONST A = 1"].join("\n"),
    };
    const { text } = flatten("/p/main.bas", io(files));
    const count = (text.match(/CONST A = 1/g) || []).length;
    assert.strictEqual(count, 1);
  });

  it("re-inlines files without $INCLUDEONCE each time", () => {
    const files = {
      "/p/main.bas": ["'$INCLUDE:'twice.bi'", "'$INCLUDE:'twice.bi'"].join("\n"),
      "/p/twice.bi": "CONST B = 2",
    };
    const { text } = flatten("/p/main.bas", io(files));
    assert.strictEqual((text.match(/CONST B = 2/g) || []).length, 2);
  });

  it("breaks include cycles", () => {
    const files = {
      "/p/a.bas": ["A = 1", "'$INCLUDE:'b.bi'"].join("\n"),
      "/p/b.bi": ["B = 2", "'$INCLUDE:'a.bas'"].join("\n"),
    };
    const { text } = flatten("/p/a.bas", io(files)); // must not hang
    assert.ok(text.includes("A = 1"));
    assert.ok(text.includes("B = 2"));
  });

  it("marks a missing include instead of failing", () => {
    const files = { "/p/main.bas": "'$INCLUDE:'gone.bi'" };
    const { text } = flatten("/p/main.bas", io(files));
    assert.ok(text.includes("missing $INCLUDE: gone.bi"));
  });

  it("rewrites DECLARE LIBRARY specs to keep the header findable", () => {
    const files = {
      "/p/main.bas": "'$INCLUDE:'sub/lib.bi'",
      "/p/sub/lib.bi": 'DECLARE LIBRARY "mylib"\nEND DECLARE LIBRARY',
    };
    const base = io(files);
    const withLib = {
      ...base,
      resolveLibrary: (spec: string, from: string) =>
        spec === "mylib" ? "/p/sub/mylib" : null,
    };
    const { text } = flatten("/p/main.bas", withLib);
    assert.ok(text.includes('DECLARE LIBRARY "/p/sub/mylib"'));
    // A system library (resolveLibrary returns null) is left untouched.
    const files2 = { "/p/main.bas": 'DECLARE LIBRARY "GL"\nEND DECLARE LIBRARY' };
    const { text: t2 } = flatten("/p/main.bas", {
      ...io(files2),
      resolveLibrary: () => null,
    });
    assert.ok(t2.includes('DECLARE LIBRARY "GL"'));
  });

  it("builds a reverse (file,line)->flatLine map", () => {
    const files = {
      "/p/main.bas": ["X = 1", "'$INCLUDE:'lib.bm'", "PRINT X"].join("\n"),
      "/p/lib.bm": ["SUB Hi", "END SUB"].join("\n"),
    };
    const { origins } = flatten("/p/main.bas", io(files));
    const rev = buildReverseMap(origins, (f) => f);
    // flat: 1=main:1, 2=directive(main:2), 3=lib:1, 4=lib:2, 5=main:3
    assert.strictEqual(rev.get("/p/main.bas")!.get(1), 1);
    assert.strictEqual(rev.get("/p/main.bas")!.get(3), 5);
    assert.strictEqual(rev.get("/p/lib.bm")!.get(1), 3);
  });
});
