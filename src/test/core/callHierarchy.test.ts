import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { SymbolIndex, createIncludeResolver, diskLoader, normalizePath } from "../../core/index";
import { callHierarchyItemAt, incomingCalls, outgoingCalls } from "../../core/callHierarchy";

const FIXTURES = path.resolve(__dirname, "../../../test/fixtures");
const F = (rel: string) => normalizePath(path.join(FIXTURES, rel));
const BASICS = F("basics.bas");
const MAIN = F("include/main.bas");
const index = new SymbolIndex(createIncludeResolver([path.join(FIXTURES, "include")]), diskLoader);
for (const f of [BASICS, MAIN]) index.setFile(f, fs.readFileSync(f, "utf8"));
const lineOf = (file: string, needle: string) => index.get(file)!.lines.findIndex((l) => l.includes(needle));
const at = (file: string, needle: string, offset = 0) => {
  const line = lineOf(file, needle);
  return { line, character: index.get(file)!.lines[line].indexOf(needle) + offset };
};

describe("core/callHierarchy", () => {
  it("prepares an item for the routine under the cursor or around it", () => {
    assert.strictEqual(callHierarchyItemAt(index, BASICS, at(BASICS, "PRINT Add(1, 2)", 6))!.name, "Add");
    const inside = callHierarchyItemAt(index, BASICS, at(BASICS, "initialised = 1"))!;
    assert.strictEqual(inside.name, "InitGame");
    assert.strictEqual(inside.kind, "sub");
    assert.strictEqual(inside.range.end.line, lineOf(BASICS, "END SUB"));
    assert.strictEqual(callHierarchyItemAt(index, BASICS, at(BASICS, "CONST MAX_PLAYERS")), null);
  });

  it("lists incoming calls, attributing module-level calls to the file", () => {
    const add = callHierarchyItemAt(index, BASICS, at(BASICS, "FUNCTION Add", 9))!;
    const calls = incomingCalls(index, add);
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].from.kind, "module");
    assert.strictEqual(calls[0].from.name, "basics.bas");
    assert.deepStrictEqual(calls[0].fromRanges.map((r) => r.start.line), [lineOf(BASICS, "PRINT Add(1, 2)")]);
  });

  it("follows calls across the include chain in both directions", () => {
    const util = F("include/nested/util.bm");
    const helper = callHierarchyItemAt(index, util, at(util, "SUB UtilHelper", 4))!;
    const incoming = incomingCalls(index, helper);
    assert.deepStrictEqual(incoming.map((c) => [c.from.name, path.basename(c.from.file)]), [["DeepValue&", "deep.bm"]]);

    const outgoing = outgoingCalls(index, incoming[0].from);
    assert.deepStrictEqual(outgoing.map((c) => c.to.name), ["UtilHelper"]);

    const main = callHierarchyItemAt(index, MAIN, { line: 0, character: 0 });
    assert.strictEqual(main, null); // module-level: reached through incoming calls instead
    const fromMain = incomingCalls(index, callHierarchyItemAt(index, F("include/nested/deep.bm"), at(F("include/nested/deep.bm"), "FUNCTION DeepValue&", 9))!);
    assert.strictEqual(fromMain[0].from.kind, "module");
    assert.deepStrictEqual(outgoingCalls(index, fromMain[0].from).map((c) => c.to.name), ["DeepValue&"]);
  });

  it("treats a FUNCTION's return-value assignment as not-a-call but keeps recursion", () => {
    const R = F("virtual/rec.bas");
    index.setFile(R, ["FUNCTION Fact& (n&)", "    IF n& <= 1 THEN Fact& = 1 ELSE Fact& = n& * Fact&(n& - 1)", "END FUNCTION", "PRINT Fact(5)"].join("\n"));
    try {
      const fact = callHierarchyItemAt(index, R, { line: 0, character: 12 })!;
      const out = outgoingCalls(index, fact);
      assert.deepStrictEqual(out.map((c) => [c.to.name, c.fromRanges.length]), [["Fact&", 1]]);
      assert.strictEqual(out[0].fromRanges[0].start.character, "    IF n& <= 1 THEN Fact& = 1 ELSE Fact& = n& * ".length);
      assert.deepStrictEqual(incomingCalls(index, fact).map((c) => c.from.kind), ["function", "module"]);
    } finally {
      index.removeFile(R);
    }
  });
});
