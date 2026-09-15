import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { parseContent, parseFile } from "../../core/parser";
import { QB64Symbol, QB64SymbolType } from "../../core/symbols";

// Fixture-driven parser tests. Each fixture in test/fixtures targets one syntax
// area (see test/fixtures/README.md).
const FIXTURES = path.resolve(__dirname, "../../../test/fixtures");

function load(rel: string): QB64Symbol[] {
  const file = path.join(FIXTURES, rel);
  return parseContent(fs.readFileSync(file, "utf8"), file);
}

function find(
  symbols: QB64Symbol[],
  name: string,
  type?: QB64SymbolType
): QB64Symbol | undefined {
  return symbols.find(
    (s) =>
      s.name.toLowerCase() === name.toLowerCase() && (!type || s.type === type)
  );
}

function names(symbols: QB64Symbol[], type?: QB64SymbolType): string[] {
  return symbols
    .filter((s) => !type || s.type === type)
    .map((s) => s.name.toLowerCase())
    .sort();
}

function paramNames(symbol: QB64Symbol): string[] {
  return (symbol.parameters || []).map((p) => p.name);
}

describe("fixtures/basics.bas", () => {
  const symbols = load("basics.bas");

  it("finds every SUB and FUNCTION", () => {
    assert.deepStrictEqual(names(symbols, "SUB"), ["drawspike", "initgame"]);
    assert.deepStrictEqual(names(symbols, "FUNCTION"), ["add"]);
  });

  it("finds TYPEs and CONSTs", () => {
    assert.deepStrictEqual(names(symbols, "TYPE"), ["player", "vec2"]);
    assert.deepStrictEqual(names(symbols, "CONST"), ["max_players", "title"]);
    assert.strictEqual(find(symbols, "TITLE", "CONST").value, '"Fixture"');
  });

  it("finds module, shared and local variables with the right scope", () => {
    assert.strictEqual(find(symbols, "players", "VARIABLE").scope, "GLOBAL");
    assert.strictEqual(find(symbols, "players", "VARIABLE").isArray, true);
    assert.strictEqual(find(symbols, "players", "VARIABLE").dataType, "Player");
    assert.strictEqual(find(symbols, "count", "VARIABLE").scope, "MODULE");
    assert.strictEqual(find(symbols, "names", "VARIABLE").scope, "GLOBAL");
    assert.strictEqual(find(symbols, "level", "VARIABLE").scope, "GLOBAL");
    assert.strictEqual(find(symbols, "i", "VARIABLE").scope, "LOCAL");
    assert.strictEqual(find(symbols, "initialised", "VARIABLE").scope, "LOCAL");
  });

  it("attaches doc comments and @param descriptions", () => {
    const add = find(symbols, "Add", "FUNCTION");
    assert.strictEqual(add.documentation, "Adds two integers.");
    assert.deepStrictEqual(paramNames(add), ["a", "b"]);
    assert.strictEqual(add.parameters[1].description, "second operand");
    assert.strictEqual(
      find(symbols, "InitGame", "SUB").documentation,
      "Initialises the game state."
    );
  });

  it("handles a SUB without a parameter list and a STATIC SUB", () => {
    assert.deepStrictEqual(paramNames(find(symbols, "InitGame", "SUB")), []);
    assert.deepStrictEqual(paramNames(find(symbols, "DrawSpike", "SUB")), [
      "X",
      "Y",
    ]);
  });

  it("does not turn assignments to the FUNCTION name into variables", () => {
    // `Add = a + b` inside FUNCTION Add is the return value, not a local.
    assert.strictEqual(find(symbols, "Add", "VARIABLE"), undefined);
  });
});

describe("fixtures/sigils.bas", () => {
  const symbols = load("sigils.bas");

  it("parses FUNCTIONs whose names carry a type sigil", () => {
    assert.deepStrictEqual(names(symbols, "FUNCTION"), [
      "describe$",
      "half%",
      "scale!",
    ]);
  });

  it("parses sigil parameters, including with no space before the paren", () => {
    assert.deepStrictEqual(paramNames(find(symbols, "Describe$")), ["n%"]);
    assert.deepStrictEqual(paramNames(find(symbols, "Scale!")), [
      "f!",
      "factor#",
    ]);
    assert.deepStrictEqual(paramNames(find(symbols, "Show", "SUB")), [
      "msg$",
      "times%",
    ]);
  });

  it("parses sigil DIMs, including arrays and multi-character sigils", () => {
    for (const n of [
      "title$",
      "count%",
      "big&",
      "ratio!",
      "precise#",
      "exes$",
      "formats$",
      "flags~%",
      "huge&&",
    ]) {
      assert.ok(find(symbols, n, "VARIABLE"), `expected variable ${n}`);
    }
    assert.strictEqual(find(symbols, "exes$", "VARIABLE").isArray, true);
    assert.strictEqual(find(symbols, "i%", "VARIABLE").scope, "LOCAL");
  });
});

describe("fixtures/dim_lists.bas", () => {
  const symbols = load("dim_lists.bas");

  it("splits `DIM a AS T, b AS U` into one variable per name", () => {
    assert.strictEqual(find(symbols, "a", "VARIABLE").dataType, "LONG");
    assert.strictEqual(find(symbols, "b", "VARIABLE").dataType, "LONG");
    assert.strictEqual(find(symbols, "buf", "VARIABLE").dataType, "STRING");
    assert.strictEqual(
      find(symbols, "z", "VARIABLE").dataType,
      "_UNSIGNED LONG"
    );
    assert.strictEqual(
      find(symbols, "a8", "VARIABLE").dataType,
      "_UNSIGNED _BYTE"
    );
  });

  it("handles `DIM AS T a, b` (type first), in any case", () => {
    assert.strictEqual(find(symbols, "basei", "VARIABLE").dataType, "LONG");
    assert.strictEqual(find(symbols, "i", "VARIABLE").dataType, "LONG");
    assert.strictEqual(find(symbols, "note", "VARIABLE").dataType, "Long");
    assert.strictEqual(find(symbols, "duration", "VARIABLE").dataType, "Long");
  });

  it("keeps fixed-length strings, ranged arrays and REDIM _PRESERVE", () => {
    assert.strictEqual(find(symbols, "name", "VARIABLE").dataType, "STRING * 8");
    const grid = find(symbols, "grid", "VARIABLE");
    assert.strictEqual(grid.isArray, true);
    assert.strictEqual(grid.scope, "GLOBAL");
    assert.strictEqual(find(symbols, "matrix", "VARIABLE").isArray, true);
    assert.strictEqual(find(symbols, "items", "VARIABLE").dataType, "STRING");
  });

  it("handles STATIC and DIM AS lists inside a SUB as locals", () => {
    for (const n of ["calls", "last", "row", "col"]) {
      const v = find(symbols, n, "VARIABLE");
      assert.ok(v, `expected variable ${n}`);
      assert.strictEqual(v.scope, "LOCAL", `${n} should be LOCAL`);
    }
  });
});

describe("fixtures/edge_cases.bas", () => {
  const symbols = load("edge_cases.bas");

  it("splits `:` multi-statement lines", () => {
    for (const n of ["first", "second", "third", "area"]) {
      assert.ok(find(symbols, n, "VARIABLE"), `expected variable ${n}`);
    }
    assert.strictEqual(find(symbols, "area", "VARIABLE").scope, "LOCAL");
  });

  it("ignores keyword-like text inside comments and strings", () => {
    assert.strictEqual(find(symbols, "notreal"), undefined);
    assert.strictEqual(find(symbols, "FakeSub"), undefined);
    assert.strictEqual(find(symbols, "NotASub"), undefined);
    assert.strictEqual(find(symbols, "NotAFunc"), undefined);
    assert.strictEqual(find(symbols, "inside_string"), undefined);
  });

  it("joins `_` line continuations before parsing", () => {
    const configure = find(symbols, "Configure", "SUB");
    assert.ok(configure, "Configure should be found");
    assert.deepStrictEqual(paramNames(configure), ["width", "height", "title"]);
    // `total = first + _` continued over three lines is one statement at module
    // level; it must not be mistaken for a declaration of anything else.
    assert.ok(find(symbols, "total", "VARIABLE"));
  });

  it("does not create spurious variables from single-line IF statements", () => {
    // `IF v < lo THEN Clamp& = lo: EXIT FUNCTION` - Clamp& is the return value.
    assert.strictEqual(find(symbols, "Clamp&", "VARIABLE"), undefined);
    assert.strictEqual(find(symbols, "v", "VARIABLE"), undefined);
  });

  it("records labels as LABEL symbols", () => {
    assert.deepStrictEqual(names(symbols, "LABEL"), ["finish", "handler"]);
  });

  it("records DECLARE LIBRARY members as SUB/FUNCTION symbols", () => {
    assert.ok(find(symbols, "Fast_Sqrt&", "FUNCTION"));
    assert.ok(find(symbols, "getpid&", "FUNCTION"));
    assert.ok(find(symbols, "Fast_Seed", "SUB"));
    assert.deepStrictEqual(paramNames(find(symbols, "Fast_Sqrt&")), ["val"]);
  });

  it("still finds the ordinary SUB/FUNCTION with correct parameters", () => {
    assert.deepStrictEqual(paramNames(find(symbols, "Clamp&", "FUNCTION")), [
      "v",
      "lo",
      "hi",
    ]);
  });
});

describe("fixtures/include", () => {
  it("parses each file of the include chain on its own", () => {
    const main = load("include/main.bas");
    assert.strictEqual(find(main, "app_name", "VARIABLE").scope, "GLOBAL");

    const lib = load("include/lib.bi");
    assert.deepStrictEqual(names(lib, "CONST"), ["lib_version"]);
    assert.deepStrictEqual(names(lib, "TYPE"), ["libinfo"]);
    assert.strictEqual(find(lib, "lib_info", "VARIABLE").dataType, "LibInfo");

    const util = load("include/nested/util.bm");
    assert.deepStrictEqual(names(util, "SUB"), ["utilhelper"]);
  });

  it("parses the sigil FUNCTION in nested/deep.bm", () => {
    const deep = load("include/nested/deep.bm");
    assert.deepStrictEqual(names(deep, "FUNCTION"), ["deepvalue&"]);
  });
});

describe("fixtures: P0.4 model additions", () => {
  const basics = load("basics.bas");
  const sigils = load("sigils.bas");
  const edge = load("edge_cases.bas");

  it("puts TYPE fields on the TYPE symbol as FIELD members, not in the flat list", () => {
    const player = find(basics, "Player", "TYPE");
    assert.deepStrictEqual(
      player.members.map((f) => [f.name, f.dataType, f.type, f.parent]),
      [
        ["name", "STRING * 16", "FIELD", "Player"],
        ["score", "_UNSIGNED _INTEGER64", "FIELD", "Player"],
        ["pos", "Vec2", "FIELD", "Player"],
      ]
    );
    assert.deepStrictEqual(find(basics, "Vec2", "TYPE").members.map((f) => f.name), ["x", "y"]);
    assert.ok(basics.every((s) => s.type !== "FIELD"));
    const lib = load("include/lib.bi");
    assert.deepStrictEqual(find(lib, "LibInfo", "TYPE").members.map((f) => f.dataType), ["LONG", "STRING * 8"]);
  });

  it("reports $INCLUDE directives with their line numbers", () => {
    const main = parseFile(fs.readFileSync(path.join(FIXTURES, "include/main.bas"), "utf8"), "main.bas");
    assert.deepStrictEqual(main.includes, [
      { path: "lib.bi", line: 2 },
      { path: "nested/deep.bm", line: 9 },
    ]);
    const deep = parseFile(fs.readFileSync(path.join(FIXTURES, "include/nested/deep.bm"), "utf8"), "deep.bm");
    assert.deepStrictEqual(deep.includes.map((i) => i.path), ["util.bm"]);
  });

  it("marks DECLARE LIBRARY routines as external with their library", () => {
    const sqrt = find(edge, "Fast_Sqrt&", "FUNCTION");
    assert.strictEqual(sqrt.isExternal, true);
    assert.strictEqual(sqrt.library, "fastmath");
    assert.strictEqual(sqrt.dataType, "LONG");
    assert.strictEqual(sqrt.parameters[0].byRef, false);
    assert.strictEqual(find(edge, "getpid&", "FUNCTION").library, "");
    assert.strictEqual(find(edge, "Clamp&", "FUNCTION").isExternal, undefined);
  });

  it("derives data types from sigils when no AS clause is present", () => {
    assert.strictEqual(find(sigils, "count%", "VARIABLE").dataType, "INTEGER");
    assert.strictEqual(find(sigils, "huge&&", "VARIABLE").dataType, "_INTEGER64");
    assert.strictEqual(find(sigils, "flags~%", "VARIABLE").dataType, "_UNSIGNED INTEGER");
    assert.strictEqual(find(sigils, "title$", "VARIABLE").dataType, "STRING");
    assert.strictEqual(find(sigils, "precise#", "VARIABLE").dataType, "DOUBLE");
    assert.strictEqual(find(sigils, "Describe$", "FUNCTION").dataType, "STRING");
    assert.strictEqual(find(sigils, "Scale!", "FUNCTION").parameters[1].type, "DOUBLE");
  });

  it("keeps STATIC routines module-scoped and flags them", () => {
    const spike = find(basics, "DrawSpike", "SUB");
    assert.strictEqual(spike.scope, "MODULE");
    assert.strictEqual(spike.isStatic, true);
    assert.strictEqual(find(basics, "InitGame", "SUB").isStatic, undefined);
    // `X = X + 1` assigns a parameter, so no local X may be invented.
    assert.strictEqual(find(basics, "X", "VARIABLE"), undefined);
  });
});
