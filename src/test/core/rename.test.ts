import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { SymbolIndex, createIncludeResolver, diskLoader, normalizePath } from "../../core/index";
import { resolveAt } from "../../core/queries";
import { renameEdits, validateNewName } from "../../core/rename";

const FIXTURES = path.resolve(__dirname, "../../../test/fixtures");
const F = (rel: string) => normalizePath(path.join(FIXTURES, rel));
const SIGILS = F("sigils.bas");
const MAIN = F("include/main.bas");
const UTIL = F("include/nested/util.bm");
const CALLER = F("virtual/caller.bas");

const index = new SymbolIndex(createIncludeResolver([path.join(FIXTURES, "include")]), diskLoader);
index.setFile(SIGILS, fs.readFileSync(SIGILS, "utf8"));
index.setFile(MAIN, fs.readFileSync(MAIN, "utf8"));
index.setFile(CALLER, "PRINT Half(4)\n" + fs.readFileSync(SIGILS, "utf8"));

const lines = (file: string) => index.get(file)!.lines;
const applied = (file: string, edits: ReturnType<typeof renameEdits>) => {
  const out = [...lines(file)];
  for (const e of edits.filter((e) => e.file === file).sort((a, b) => b.range.start.character - a.range.start.character)) {
    const l = out[e.range.start.line];
    out[e.range.start.line] = l.substring(0, e.range.start.character) + e.newText + l.substring(e.range.end.character);
  }
  return out;
};

describe("core/rename", () => {
  it("validates names: identifiers only, reserved prefix, sigil must be kept", () => {
    const half = index.lookup("Half%")[0];
    assert.strictEqual(validateNewName(half, "Third%"), null);
    assert.ok(validateNewName(half, "Third")!.includes("Third%"));
    assert.ok(validateNewName(half, "_Third%"));
    assert.ok(validateNewName(half, "3rd%"));
    assert.ok(validateNewName(half, "a b%"));
    const util = index.lookup("UtilHelper")[0];
    assert.strictEqual(validateNewName(util, "Helper"), null);
    assert.ok(validateNewName(util, "Helper$"));
    assert.ok(validateNewName(util, ""));
  });

  it("renames every occurrence, keeping each site's sigil spelling", () => {
    const half = resolveAt(index, CALLER, { line: 0, character: 7 })!.symbol; // Half(4) -> Half%
    const edits = renameEdits(index, half, "Third%");
    assert.strictEqual(edits.length, 4);
    const result = applied(CALLER, edits);
    assert.strictEqual(result[0], "PRINT Third(4)");
    assert.ok(result.some((l) => l.startsWith("FUNCTION Third% (value%)")));
    assert.ok(result.some((l) => l.includes("Third% = value% \\ 2")));
    assert.ok(result.some((l) => l.includes("PRINT Third%(10)")));
  });

  it("renames across the files of a compilation unit", () => {
    const util = index.lookup("UtilHelper")[0];
    const edits = renameEdits(index, util, "Helper");
    assert.deepStrictEqual(
      edits.map((e) => [path.basename(e.file), e.range.start.line, e.newText]),
      [["util.bm", 1, "Helper"], ["deep.bm", 5, "Helper"]]
    );
    assert.strictEqual(applied(UTIL, edits)[1], "SUB Helper (n AS LONG)");
  });
});
