import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { SymbolIndex, createIncludeResolver, diskLoader, normalizePath } from "../../core/index";
import {
  Occurrence,
  Position,
  findDefinition,
  findOccurrences,
  resolveAt,
  symbolsInScope,
} from "../../core/queries";

const FIXTURES = path.resolve(__dirname, "../../../test/fixtures");
const F = (rel: string) => normalizePath(path.join(FIXTURES, rel));
const BASICS = F("basics.bas");
const SIGILS = F("sigils.bas");
const EDGE = F("edge_cases.bas");
const MAIN = F("include/main.bas");
const LIB = F("include/lib.bi");
const DEEP = F("include/nested/deep.bm");
const UTIL = F("include/nested/util.bm");

function buildIndex(): SymbolIndex {
  const index = new SymbolIndex(createIncludeResolver([path.join(FIXTURES, "include")]), diskLoader);
  index.loadMany(
    [BASICS, SIGILS, EDGE, MAIN].map((f): [string, string] => [f, fs.readFileSync(f, "utf8")])
  );
  return index;
}

/** Position of the nth occurrence of `needle` in `file`, plus `offset` chars. */
function at(index: SymbolIndex, file: string, needle: string, offset = 0, nth = 0): Position {
  const lines = index.get(file)!.lines;
  let seen = 0;
  for (let line = 0; line < lines.length; line++) {
    const character = lines[line].indexOf(needle);
    if (character >= 0 && seen++ === nth) return { line, character: character + offset };
  }
  throw new Error(`"${needle}" not found in ${file}`);
}

const brief = (o: Occurrence) =>
  `${path.basename(o.file)}:${o.range.start.line}:${o.range.start.character}:${o.kind}`;

describe("core/queries", () => {
  const index = buildIndex();
  const lineOf = (file: string, needle: string) => at(index, file, needle).line;

  describe("resolveAt", () => {
    it("resolves calls to SUBs and FUNCTIONs", () => {
      const sub = resolveAt(index, BASICS, at(index, BASICS, "InitGame\n".trim(), 0, 1))!;
      assert.strictEqual(sub.symbol.type, "SUB");
      assert.strictEqual(sub.symbol.line, lineOf(BASICS, "SUB InitGame"));
      const fn = resolveAt(index, BASICS, at(index, BASICS, "PRINT Add(1, 2)", 6))!;
      assert.strictEqual(fn.symbol.type, "FUNCTION");
      assert.strictEqual(fn.word, "Add");
    });

    it("prefers locals inside a routine and finds parameters", () => {
      const local = resolveAt(index, BASICS, at(index, BASICS, "initialised = 1"))!;
      assert.strictEqual(local.symbol.scope, "LOCAL");
      assert.strictEqual(local.symbol.line, lineOf(BASICS, "STATIC initialised"));

      const param = resolveAt(index, BASICS, at(index, BASICS, "Add = a + b", 6))!;
      assert.strictEqual(param.symbol.isParameter, true);
      assert.strictEqual(param.symbol.dataType, "INTEGER");
      assert.strictEqual(param.symbol.line, lineOf(BASICS, "FUNCTION Add"));

      const ret = resolveAt(index, BASICS, at(index, BASICS, "Add = a + b"))!;
      assert.strictEqual(ret.symbol.type, "FUNCTION"); // the return value
    });

    it("returns null symbol for keywords and null for non-identifiers", () => {
      assert.strictEqual(resolveAt(index, BASICS, at(index, BASICS, "PRINT Add"))!.symbol, null);
      assert.strictEqual(resolveAt(index, BASICS, at(index, BASICS, "' A 2D vector", 3)), null);
      assert.strictEqual(resolveAt(index, BASICS, at(index, BASICS, "= 4", 0)), null);
    });

    it("finds a routine called without its sigil", () => {
      index.setFile(F("virtual/call.bas"), "PRINT Half(4)\n" + fs.readFileSync(SIGILS, "utf8"));
      const res = resolveAt(index, F("virtual/call.bas"), { line: 0, character: 7 })!;
      assert.strictEqual(res.symbol.name, "Half%");
      index.removeFile(F("virtual/call.bas"));
    });

    it("resolves across the include chain, in both directions", () => {
      const fn = resolveAt(index, MAIN, at(index, MAIN, "DeepValue&"))!;
      assert.strictEqual(fn.symbol.file, DEEP);
      const konst = resolveAt(index, MAIN, at(index, MAIN, "LIB_VERSION"))!;
      assert.strictEqual(konst.symbol.file, LIB);
      // From util.bm (a leaf) a symbol of its root program is visible.
      index.setFile(UTIL, fs.readFileSync(UTIL, "utf8") + "SUB Extra\n  PRINT app_name\nEND SUB\n");
      const up = resolveAt(index, UTIL, at(index, UTIL, "app_name"))!;
      assert.strictEqual(up.symbol.file, MAIN);
      index.setFile(UTIL, fs.readFileSync(UTIL, "utf8"));
    });

    it("resolves labels and TYPE names", () => {
      const label = resolveAt(index, EDGE, at(index, EDGE, "GOTO finish", 5))!;
      assert.strictEqual(label.symbol.type, "LABEL");
      const type = resolveAt(index, BASICS, at(index, BASICS, "AS Player", 3))!;
      assert.strictEqual(type.symbol.type, "TYPE");
    });
  });

  describe("member access", () => {
    const MEM = F("virtual/mem.bas");
    const source = [
      "TYPE Vec2",
      "    x AS SINGLE",
      "END TYPE",
      "TYPE Player",
      "    pos AS Vec2",
      "    name AS STRING * 16",
      "END TYPE",
      "DIM p AS Player",
      "DIM team(3) AS Player",
      "p.pos.x = 1",
      "PRINT team(1).name; p.pos.x",
      "SUB Move (pl AS Player)",
      "    pl.pos.x = 2",
      "END SUB",
    ].join("\n");
    before(() => index.setFile(MEM, source));
    after(() => index.removeFile(MEM));

    it("resolves dotted chains through TYPE members", () => {
      const x = resolveAt(index, MEM, { line: 9, character: 6 })!;
      assert.deepStrictEqual(x.chain, ["p", "pos"]);
      assert.strictEqual(x.symbol.type, "FIELD");
      assert.strictEqual(x.owner.name, "Vec2");

      const name = resolveAt(index, MEM, { line: 10, character: 15 })!;
      assert.strictEqual(name.symbol.name, "name");
      assert.strictEqual(name.owner.name, "Player");

      const viaParam = resolveAt(index, MEM, { line: 12, character: 11 })!;
      assert.strictEqual(viaParam.symbol.parent, "Vec2");
    });

    it("resolves a field name inside its TYPE block", () => {
      const decl = resolveAt(index, MEM, { line: 4, character: 4 })!;
      assert.strictEqual(decl.symbol.type, "FIELD");
      assert.strictEqual(decl.symbol.name, "pos");
    });

    it("finds all occurrences of a field and of a TYPE", () => {
      const x = resolveAt(index, MEM, { line: 1, character: 4 })!.symbol;
      assert.deepStrictEqual(findOccurrences(index, x).map(brief), [
        "mem.bas:1:4:declaration",
        "mem.bas:9:6:write",
        "mem.bas:10:26:read",
        "mem.bas:12:11:write",
      ]);
      const player = resolveAt(index, MEM, { line: 3, character: 5 })!.symbol;
      assert.deepStrictEqual(findOccurrences(index, player).map((o) => o.range.start.line), [3, 7, 8, 11]);
    });
  });

  describe("findDefinition", () => {
    it("points at the exact name on the declaration line", () => {
      const [def] = findDefinition(index, BASICS, at(index, BASICS, "PRINT Add(1, 2)", 6));
      assert.strictEqual(def.file, BASICS);
      assert.strictEqual(def.range.start.line, lineOf(BASICS, "FUNCTION Add"));
      assert.strictEqual(def.range.start.character, "FUNCTION ".length);
      assert.strictEqual(def.range.end.character, "FUNCTION Add".length);
    });

    it("locates a parameter on its routine's header", () => {
      const [def] = findDefinition(index, BASICS, at(index, BASICS, "X = X + 1", 4));
      assert.strictEqual(def.range.start.line, lineOf(BASICS, "SUB DrawSpike"));
      assert.strictEqual(def.range.start.character, "SUB DrawSpike (".length);
    });

    it("returns nothing for keywords", () => {
      assert.deepStrictEqual(findDefinition(index, BASICS, at(index, BASICS, "PRINT Add")), []);
    });

    it("finds parameters declared on a continued header line", () => {
      const use = at(index, EDGE, "area = width * height", "area = width * ".length);
      const [def] = findDefinition(index, EDGE, use);
      const headerLine = lineOf(EDGE, "SUB Configure");
      assert.strictEqual(def.range.start.line, headerLine + 1);
      assert.strictEqual(def.range.start.character, index.get(EDGE)!.lines[headerLine + 1].indexOf("height"));
      const height = resolveAt(index, EDGE, use)!.symbol;
      assert.deepStrictEqual(findOccurrences(index, height).map((o) => o.kind), ["declaration", "read"]);
    });
  });

  describe("findOccurrences", () => {
    it("crosses files within the compilation unit", () => {
      const helper = resolveAt(index, UTIL, at(index, UTIL, "SUB UtilHelper", 4))!.symbol;
      assert.deepStrictEqual(findOccurrences(index, helper).map(brief), [
        "util.bm:1:4:declaration",
        "deep.bm:5:4:read",
      ]);
      assert.deepStrictEqual(findOccurrences(index, helper, false).map(brief), ["deep.bm:5:4:read"]);
    });

    it("includes calls without the sigil and tags writes", () => {
      const half = resolveAt(index, SIGILS, at(index, SIGILS, "FUNCTION Half%", 9))!.symbol;
      const kinds = findOccurrences(index, half).map(brief);
      assert.ok(kinds.includes(`sigils.bas:${lineOf(SIGILS, "Half% = value%")}:4:write`), kinds.join());
      assert.strictEqual(kinds.length, 3); // declaration, PRINT Half%(10), Half% = …
    });

    it("keeps locals and parameters inside their routine", () => {
      const X = resolveAt(index, BASICS, at(index, BASICS, "X = X + 1"))!.symbol;
      assert.deepStrictEqual(findOccurrences(index, X).map(brief), [
        `basics.bas:${lineOf(BASICS, "SUB DrawSpike")}:15:declaration`,
        `basics.bas:${lineOf(BASICS, "X = X + 1")}:4:write`,
        `basics.bas:${lineOf(BASICS, "X = X + 1")}:8:read`,
      ]);
    });

    it("does not confuse same-named variables in different scopes", () => {
      const SC = F("virtual/scopes.bas");
      index.setFile(SC, [
        "DIM i AS LONG",
        "i = 1",
        "SUB A",
        "    DIM i AS LONG",
        "    i = 2",
        "END SUB",
        "SUB B",
        "    i = 3",
        "END SUB",
      ].join("\n"));
      try {
        const moduleI = resolveAt(index, SC, { line: 0, character: 4 })!.symbol;
        assert.deepStrictEqual(findOccurrences(index, moduleI).map((o) => o.range.start.line), [0, 1, 7]);
        const localI = resolveAt(index, SC, { line: 3, character: 8 })!.symbol;
        assert.deepStrictEqual(findOccurrences(index, localI).map((o) => o.range.start.line), [3, 4]);
      } finally {
        index.removeFile(SC);
      }
    });

    it("finds labels used by GOTO/GOSUB", () => {
      const handler = resolveAt(index, EDGE, at(index, EDGE, "handler:"))!.symbol;
      assert.deepStrictEqual(findOccurrences(index, handler).map((o) => o.kind), ["declaration", "read"]);
      assert.deepStrictEqual(
        findOccurrences(index, handler).map((o) => o.range.start.line).sort((a, b) => a - b),
        [lineOf(EDGE, "GOSUB handler"), lineOf(EDGE, "handler:")]
      );
    });
  });
});

describe("core/queries symbolsInScope", () => {
  const index = buildIndex();
  const names = (file: string, line: number) =>
    symbolsInScope(index, file, line).map((s) => s.name.toLowerCase());

  it("offers params and locals inside a routine, module symbols everywhere", () => {
    const inInit = names(BASICS, at(index, BASICS, "initialised = 1").line);
    for (const n of ["initialised", "i", "initgame", "add", "drawspike", "vec2", "player", "max_players", "players", "level"]) {
      assert.ok(inInit.includes(n), `expected ${n} in ${inInit.join()}`);
    }
    const inAdd = names(BASICS, at(index, BASICS, "Add = a + b").line);
    assert.ok(inAdd.includes("a") && inAdd.includes("b"));
    assert.ok(!inAdd.includes("initialised"), "another routine's local must not leak");

    const atModule = names(BASICS, at(index, BASICS, "PRINT Add(1, 2)").line);
    assert.ok(!atModule.includes("initialised") && !atModule.includes("i"));
    assert.ok(atModule.includes("count"));
  });

  it("includes symbols from the whole compilation unit", () => {
    const fromMain = names(MAIN, 5);
    for (const n of ["deepvalue&", "lib_version", "libinfo", "lib_info", "utilhelper", "app_name"]) {
      assert.ok(fromMain.includes(n), `expected ${n}`);
    }
    assert.ok(names(UTIL, 0).includes("app_name"), "leaf sees its root's globals");
  });

  it("dedupes by name preferring the nearest scope", () => {
    const SC = F("virtual/scope2.bas");
    index.setFile(SC, ["DIM i AS LONG", "SUB A", "    DIM i AS STRING", "    i = \"x\"", "END SUB"].join("\n"));
    try {
      const inA = symbolsInScope(index, SC, 3).filter((s) => s.name === "i");
      assert.strictEqual(inA.length, 1);
      assert.strictEqual(inA[0].dataType, "STRING");
    } finally {
      index.removeFile(SC);
    }
  });
});
