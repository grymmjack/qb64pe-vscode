import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { SymbolIndex, createIncludeResolver, diskLoader, normalizePath } from "../../core/index";
import { SemanticToken, semanticTokens } from "../../core/semantic";

const FIXTURES = path.resolve(__dirname, "../../../test/fixtures");
const F = (rel: string) => normalizePath(path.join(FIXTURES, rel));
const BASICS = F("basics.bas");
const EDGE = F("edge_cases.bas");
const MAIN = F("include/main.bas");
const MEM = F("virtual/mem.bas");

const index = new SymbolIndex(createIncludeResolver([path.join(FIXTURES, "include")]), diskLoader);
for (const f of [BASICS, EDGE, MAIN]) index.setFile(f, fs.readFileSync(f, "utf8"));
index.setFile(MEM, [
  "TYPE Vec2",
  "    x AS SINGLE",
  "END TYPE",
  "DIM p AS Vec2",
  "p.x = 1: PRINT p.x",
].join("\n"));

function tok(file: string, needle: string, word: string, nth = 0): SemanticToken | undefined {
  const lines = index.get(file)!.lines;
  const line = lines.findIndex((l) => l.includes(needle));
  const all = semanticTokens(index, file).filter(
    (t) => t.line === line && lines[line].substr(t.start, t.length) === word
  );
  return all[nth];
}
const brief = (t?: SemanticToken) => (t ? `${t.type}:${t.modifiers.join("+")}` : "none");

describe("core/semantic", () => {
  it("tags routine declarations and calls, including sigil-less calls", () => {
    assert.strictEqual(brief(tok(BASICS, "SUB InitGame", "InitGame")), "method:declaration");
    assert.strictEqual(brief(tok(BASICS, "InitGame", "InitGame")), "method:"); // the bare call on line 25
    assert.strictEqual(brief(tok(BASICS, "PRINT Add(1, 2)", "Add")), "function:");
    const CALL = F("virtual/call.bas");
    index.setFile(CALL, "PRINT Half(4)\n" + fs.readFileSync(F("sigils.bas"), "utf8"));
    try {
      assert.strictEqual(brief(tok(CALL, "PRINT Half(4)", "Half")), "function:");
    } finally {
      index.removeFile(CALL);
    }
  });

  it("distinguishes declaration, read and modification for variables and parameters", () => {
    assert.strictEqual(brief(tok(BASICS, "DIM count AS INTEGER", "count")), "variable:declaration");
    assert.strictEqual(brief(tok(BASICS, "initialised = 1", "initialised")), "variable:modification");
    assert.strictEqual(brief(tok(BASICS, "FUNCTION Add", "a")), "parameter:declaration");
    assert.strictEqual(brief(tok(BASICS, "Add = a + b", "a")), "parameter:");
    assert.strictEqual(brief(tok(BASICS, "X = X + 1", "X", 0)), "parameter:modification");
    assert.strictEqual(brief(tok(BASICS, "X = X + 1", "X", 1)), "parameter:");
    assert.strictEqual(brief(tok(BASICS, "Add = a + b", "Add")), "function:");
  });

  it("marks constants readonly, static routines static, externals defaultLibrary", () => {
    assert.strictEqual(brief(tok(BASICS, "CONST MAX_PLAYERS", "MAX_PLAYERS")), "variable:declaration+readonly");
    assert.strictEqual(brief(tok(BASICS, "players(MAX_PLAYERS)", "MAX_PLAYERS")), "variable:readonly");
    assert.strictEqual(brief(tok(BASICS, "SUB DrawSpike", "DrawSpike")), "method:declaration+static");
    assert.strictEqual(brief(tok(EDGE, "FUNCTION Fast_Sqrt&", "Fast_Sqrt&")), "function:declaration+defaultLibrary");
  });

  it("tags TYPEs, fields (declarations and member accesses) and labels", () => {
    assert.strictEqual(brief(tok(BASICS, "TYPE Player", "Player")), "struct:declaration");
    assert.strictEqual(brief(tok(BASICS, "AS Player", "Player")), "struct:");
    assert.strictEqual(brief(tok(BASICS, "pos AS Vec2", "pos")), "property:declaration");
    assert.strictEqual(brief(tok(BASICS, "pos AS Vec2", "Vec2")), "struct:");
    assert.strictEqual(brief(tok(MEM, "p.x = 1", "x", 0)), "property:modification");
    assert.strictEqual(brief(tok(MEM, "p.x = 1", "x", 1)), "property:");
    assert.strictEqual(brief(tok(EDGE, "handler:", "handler")), "label:declaration");
    assert.strictEqual(brief(tok(EDGE, "GOSUB handler", "handler")), "label:");
  });

  it("never tags keywords, comments or strings, and resolves across includes", () => {
    assert.strictEqual(tok(BASICS, "DIM count AS INTEGER", "DIM"), undefined);
    assert.strictEqual(tok(BASICS, "DIM count AS INTEGER", "INTEGER"), undefined);
    assert.strictEqual(tok(EDGE, "' SUB FakeSub", "FakeSub"), undefined);
    assert.strictEqual(tok(EDGE, 'PRINT "SUB NotASub"', "NotASub"), undefined);
    assert.strictEqual(brief(tok(MAIN, "DeepValue&(LIB_VERSION)", "DeepValue&")), "function:");
    assert.strictEqual(brief(tok(MAIN, "DeepValue&(LIB_VERSION)", "LIB_VERSION")), "variable:readonly");
  });
});
