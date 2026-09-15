import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import {
  SymbolIndex,
  createIncludeResolver,
  diskLoader,
  normalizePath,
} from "../../core/index";

const FIXTURES = path.resolve(__dirname, "../../../test/fixtures");
const INC = path.join(FIXTURES, "include");
const MAIN = normalizePath(path.join(INC, "main.bas"));
const LIB = normalizePath(path.join(INC, "lib.bi"));
const DEEP = normalizePath(path.join(INC, "nested/deep.bm"));
const UTIL = normalizePath(path.join(INC, "nested/util.bm"));

const read = (file: string) => fs.readFileSync(file, "utf8");
const sorted = (items: string[]) => [...items].sort();

function build(files: string[], withLoader = false): SymbolIndex {
  const index = new SymbolIndex(
    createIncludeResolver([INC]),
    withLoader ? diskLoader : undefined
  );
  index.loadMany(files.map((f): [string, string] => [f, read(f)]));
  return index;
}

describe("core/index SymbolIndex", () => {
  describe("include graph", () => {
    const index = build([MAIN, LIB, DEEP, UTIL]);

    it("resolves includes relative to the including file", () => {
      assert.deepStrictEqual(index.includesOf(MAIN), [LIB, DEEP]);
      assert.deepStrictEqual(index.includesOf(DEEP), [UTIL]); // 'util.bm' next to deep.bm, not main.bas
      assert.deepStrictEqual(index.includesOf(UTIL), []);
    });

    it("keeps the reverse edges", () => {
      assert.deepStrictEqual(index.includedByOf(LIB), [MAIN]);
      assert.deepStrictEqual(index.includedByOf(UTIL), [DEEP]);
      assert.deepStrictEqual(index.includedByOf(MAIN), []);
    });

    it("computes closure, roots and compilation unit", () => {
      assert.deepStrictEqual(sorted(index.closure(MAIN)), sorted([MAIN, LIB, DEEP, UTIL]));
      assert.deepStrictEqual(sorted(index.closure(DEEP)), sorted([DEEP, UTIL]));
      assert.deepStrictEqual(index.rootsOf(UTIL), [MAIN]);
      assert.deepStrictEqual(index.rootsOf(MAIN), [MAIN]);
      assert.deepStrictEqual(sorted(index.unitOf(UTIL)), sorted([MAIN, LIB, DEEP, UTIL]));
    });
  });

  describe("name lookup", () => {
    const index = build([MAIN, LIB, DEEP, UTIL]);

    it("is case-insensitive and keeps the sigil significant", () => {
      assert.strictEqual(index.lookup("DEEPVALUE&").length, 1);
      assert.strictEqual(index.lookup("deepvalue&")[0].file, DEEP);
      assert.strictEqual(index.lookup("deepvalue").length, 0);
    });

    it("can ignore the sigil and restrict to a file set", () => {
      assert.strictEqual(index.lookupBase("DeepValue").length, 1);
      assert.strictEqual(index.lookupBase("DeepValue", [MAIN, LIB]).length, 0);
      assert.strictEqual(index.lookupBase("DeepValue", index.unitOf(LIB)).length, 1);
    });

    it("lists symbols per file and overall", () => {
      assert.deepStrictEqual(index.symbolsOf(UTIL).map((s) => s.name), ["UtilHelper"]);
      assert.ok(index.allSymbols().length >= 6);
      assert.strictEqual(index.size, 4);
    });
  });

  describe("incremental updates", () => {
    it("links a forward reference once the included file arrives", () => {
      const index = build([MAIN]);
      // Includes resolve against the disk, so the edges exist even before the
      // targets are indexed…
      assert.deepStrictEqual(index.includesOf(MAIN), [LIB, DEEP]);
      assert.deepStrictEqual(index.unresolvedIncludesOf(MAIN), []);
      assert.deepStrictEqual(index.includedByOf(LIB), [MAIN]);
      // …but a file only joins the closure once it is indexed.
      assert.deepStrictEqual(index.closure(MAIN), [MAIN]);
      index.setFile(LIB, read(LIB));
      assert.deepStrictEqual(sorted(index.closure(MAIN)), sorted([MAIN, LIB]));
    });

    it("re-resolves truly unresolved includes when a matching file is created", () => {
      const scratch = path.join(INC, "later.bi");
      const index = new SymbolIndex(createIncludeResolver([INC]));
      index.setFile(path.join(INC, "a.bas"), "'$INCLUDE:'later.bi'\nx = 1\n");
      assert.deepStrictEqual(index.unresolvedIncludesOf(path.join(INC, "a.bas")).map((i) => i.path), ["later.bi"]);
      fs.writeFileSync(scratch, "CONST LATER = 1\n");
      try {
        index.setFile(scratch, read(scratch));
        assert.deepStrictEqual(index.includesOf(path.join(INC, "a.bas")), [normalizePath(scratch)]);
        assert.strictEqual(index.lookup("LATER").length, 1);
      } finally {
        fs.unlinkSync(scratch);
      }
    });

    it("removing an indexed file drops its symbols and takes it out of closures", () => {
      const index = build([MAIN, LIB, DEEP, UTIL]);
      assert.strictEqual(index.removeFile(UTIL), true);
      assert.strictEqual(index.lookup("UtilHelper").length, 0);
      assert.deepStrictEqual(index.closure(DEEP), [DEEP]);
      // util.bm is still on disk, so deep.bm's include still resolves to it.
      assert.deepStrictEqual(index.includedByOf(UTIL), [DEEP]);
      assert.strictEqual(index.removeFile(UTIL), false);
      assert.strictEqual(index.size, 3);
    });

    it("a file deleted from disk leaves its includers with an unresolved include", () => {
      const gone = path.join(INC, "nested/gone.bm");
      const user = path.join(INC, "user.bas");
      fs.writeFileSync(gone, "SUB Gone\nEND SUB\n");
      const index = new SymbolIndex(createIncludeResolver([INC]));
      index.loadMany([[user, "'$INCLUDE:'nested/gone.bm'\n"], [gone, read(gone)]]);
      assert.deepStrictEqual(index.includesOf(user), [normalizePath(gone)]);
      fs.unlinkSync(gone);
      index.removeFile(gone);
      assert.deepStrictEqual(index.includesOf(user), []);
      assert.deepStrictEqual(index.unresolvedIncludesOf(user).map((i) => i.path), ["nested/gone.bm"]);
      assert.deepStrictEqual(index.includedByOf(gone), []);
      assert.strictEqual(index.lookup("Gone").length, 0);
    });

    it("replacing a file's content updates symbols and edges", () => {
      const index = build([MAIN, LIB, DEEP, UTIL]);
      index.setFile(MAIN, "'$INCLUDE:'lib.bi'\nDIM SHARED only AS LONG\n");
      assert.deepStrictEqual(index.includesOf(MAIN), [LIB]);
      assert.deepStrictEqual(index.includedByOf(DEEP), []);
      assert.strictEqual(index.lookup("app_name").length, 0);
      assert.strictEqual(index.lookup("only").length, 1);
      assert.deepStrictEqual(index.rootsOf(UTIL), [DEEP]);
      assert.deepStrictEqual(sorted(index.unitOf(UTIL)), sorted([DEEP, UTIL]));
    });

    it("rename = remove + add under the new path", () => {
      const index = build([MAIN, LIB, DEEP, UTIL]);
      const moved = path.join(INC, "nested/moved.bm");
      index.renameFile(UTIL, moved, read(UTIL));
      assert.strictEqual(index.has(UTIL), false);
      assert.strictEqual(index.lookup("UtilHelper")[0].file, normalizePath(moved));
      assert.deepStrictEqual(index.includedByOf(normalizePath(moved)), []);
      assert.deepStrictEqual(index.unresolvedIncludesOf(DEEP).map((i) => i.path), []); // util.bm still on disk
    });
  });

  describe("loader", () => {
    it("pulls in resolved includes that are not indexed yet, transitively", () => {
      const index = build([MAIN], true);
      assert.deepStrictEqual(sorted(index.paths()), sorted([MAIN, LIB, DEEP, UTIL]));
      assert.deepStrictEqual(sorted(index.closure(MAIN)), sorted([MAIN, LIB, DEEP, UTIL]));
      assert.strictEqual(index.lookup("UtilHelper").length, 1);
    });
  });

  describe("createIncludeResolver", () => {
    it("normalises backslashes and falls back to the roots", () => {
      const resolve = createIncludeResolver([INC]);
      assert.strictEqual(resolve(MAIN, "nested\\deep.bm"), DEEP);
      assert.strictEqual(resolve(DEEP, "lib.bi"), LIB); // not next to deep.bm, found via root
      assert.strictEqual(resolve(MAIN, "missing.bi"), null);
      assert.strictEqual(resolve(MAIN, ""), null);
    });
  });
});
