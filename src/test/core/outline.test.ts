import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { SymbolIndex, createIncludeResolver, normalizePath } from "../../core/index";
import { OutlineNode, buildOutline } from "../../core/outline";

const FIXTURES = path.resolve(__dirname, "../../../test/fixtures");
const F = (rel: string) => normalizePath(path.join(FIXTURES, rel));
const index = new SymbolIndex(createIncludeResolver([path.join(FIXTURES, "include")]));
for (const f of ["basics.bas", "edge_cases.bas", "include/main.bas"]) {
  index.setFile(F(f), fs.readFileSync(F(f), "utf8"));
}
const names = (nodes: OutlineNode[]) => nodes.map((n) => n.name);
const lineOf = (file: string, needle: string) =>
  index.get(file)!.lines.findIndex((l) => l.includes(needle));

describe("core/outline", () => {
  const basics = buildOutline(index, F("basics.bas"));

  it("lists top-level symbols in source order with the right kinds", () => {
    assert.deepStrictEqual(names(basics), [
      "Vec2", "Player", "MAX_PLAYERS", "TITLE", "players", "count", "names", "level",
      "InitGame", "Add", "DrawSpike",
    ]);
    assert.deepStrictEqual(basics.map((n) => n.kind), [
      "type", "type", "const", "const", "variable", "variable", "variable", "variable",
      "sub", "function", "sub",
    ]);
  });

  it("nests parameters and locals under their routine", () => {
    const init = basics.find((n) => n.name === "InitGame")!;
    assert.deepStrictEqual(names(init.children), ["initialised", "i"]);
    const add = basics.find((n) => n.name === "Add")!;
    assert.deepStrictEqual(add.children.map((c) => [c.name, c.kind, c.detail]), [
      ["a", "parameter", "INTEGER"],
      ["b", "parameter", "INTEGER"],
    ]);
    assert.strictEqual(add.detail, "(a AS INTEGER, b AS INTEGER)");
  });

  it("nests fields under their TYPE", () => {
    const player = basics.find((n) => n.name === "Player")!;
    assert.deepStrictEqual(player.children.map((c) => [c.name, c.detail]), [
      ["name", "STRING * 16"], ["score", "_UNSIGNED _INTEGER64"], ["pos", "Vec2"],
    ]);
  });

  it("uses full-body ranges and header selection ranges for routines", () => {
    const init = basics.find((n) => n.name === "InitGame")!;
    const header = lineOf(F("basics.bas"), "SUB InitGame");
    assert.strictEqual(init.range.start.line, header);
    assert.strictEqual(init.range.end.line, lineOf(F("basics.bas"), "END SUB"));
    assert.deepStrictEqual(init.selectionRange, {
      start: { line: header, character: 4 },
      end: { line: header, character: 12 },
    });
    // children lie inside the parent range
    for (const c of init.children) {
      assert.ok(c.range.start.line >= init.range.start.line && c.range.end.line <= init.range.end.line);
    }
  });

  it("shows includes, named labels and external routines", () => {
    const main = buildOutline(index, F("include/main.bas"));
    assert.deepStrictEqual(main.map((n) => [n.name, n.kind]), [
      ["lib.bi", "include"], ["app_name", "variable"], ["nested/deep.bm", "include"],
    ]);
    const edge = buildOutline(index, F("edge_cases.bas"));
    const sqrt = edge.find((n) => n.name === "Fast_Sqrt&")!;
    assert.strictEqual(sqrt.external, true);
    assert.ok(sqrt.detail.includes('DECLARE LIBRARY "fastmath"'));
    assert.deepStrictEqual(edge.filter((n) => n.kind === "label").map((n) => n.name), ["handler", "finish"]);
    const configure = edge.find((n) => n.name === "Configure")!;
    assert.deepStrictEqual(names(configure.children), ["width", "height", "title", "area"]);
  });

  it("omits numeric line-number labels", () => {
    index.setFile(F("virtual/nums.bas"), "10 PRINT \"a\"\n20 GOTO 10\nagain:\n");
    assert.deepStrictEqual(names(buildOutline(index, F("virtual/nums.bas"))), ["again"]);
    index.removeFile(F("virtual/nums.bas"));
  });
});
