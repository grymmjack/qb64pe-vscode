#!/usr/bin/env node
/**
 * qb64ref — headless QB64PE code intelligence.
 *
 * Runs the extension's vscode-free engine (src/core) over a codebase, so the
 * same definitions / references / symbol search the editor gives are available
 * from the command line (and to tooling/agents).
 *
 * Usage (after `npm run compile`):
 *   node scripts/qb64ref.js <root> def  <name>          where a name is defined
 *   node scripts/qb64ref.js <root> refs <name>          all references to it
 *   node scripts/qb64ref.js <root> sym  <query>         fuzzy symbol search
 *   node scripts/qb64ref.js <root> at   <file> <ln> <col>   resolve at a position (1-based)
 */
const fs = require("fs");
const path = require("path");
const {
  SymbolIndex,
  createIncludeResolver,
  diskLoader,
  normalizePath,
} = require("../out/core/index");
const {
  findDefinition,
  findOccurrences,
  searchSymbols,
  declarationOf,
} = require("../out/core/queries");

const [root, cmd, ...rest] = process.argv.slice(2);
if (!root || !cmd) {
  console.error("usage: qb64ref <root> def|refs|sym|at <args>");
  process.exit(2);
}

const exts = new Set([".bas", ".bi", ".bm", ".inc"]);
function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.name.startsWith(".") || name.name === "node_modules") continue;
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walk(full, out);
    else if (exts.has(path.extname(name.name).toLowerCase())) out.push(full);
  }
  return out;
}

const index = new SymbolIndex(createIncludeResolver([root]), diskLoader);
const files = walk(path.resolve(root));
index.loadMany(
  files
    .map((f) => {
      try {
        return [normalizePath(f), fs.readFileSync(f, "utf8")];
      } catch {
        return null;
      }
    })
    .filter(Boolean)
);

const rel = (f) => path.relative(root, f);
const loc = (o) => `${rel(o.file)}:${o.range.start.line + 1}:${o.range.start.character + 1}`;
const kindOf = (s) => s.type + (s.dataType ? ` ${s.dataType}` : "");

function pickSymbols(name) {
  const hits = index.lookupBase(name);
  return hits.length ? hits : index.lookup(name);
}

if (cmd === "def") {
  const name = rest[0];
  const syms = pickSymbols(name);
  if (!syms.length) return console.log(`no definition found for '${name}'`);
  for (const s of syms) {
    const d = declarationOf(index, s);
    console.log(`${kindOf(s)}  ${s.name}   ${loc(d)}`);
  }
} else if (cmd === "refs") {
  const name = rest[0];
  const syms = pickSymbols(name);
  if (!syms.length) return console.log(`no symbol named '${name}'`);
  for (const s of syms) {
    const occ = findOccurrences(index, s, true);
    console.log(`\n${kindOf(s)} ${s.name}  (${occ.length} occurrence(s)):`);
    for (const o of occ) console.log(`  ${o.kind.padEnd(11)} ${loc(o)}`);
  }
} else if (cmd === "sym") {
  const q = rest.join(" ");
  const found = searchSymbols(index, q, 50);
  if (!found.length) return console.log(`no symbols matching '${q}'`);
  for (const s of found) console.log(`${kindOf(s).padEnd(20)} ${s.name.padEnd(28)} ${rel(s.file)}:${s.line + 1}`);
} else if (cmd === "at") {
  const [file, ln, col] = rest;
  const defs = findDefinition(index, normalizePath(path.resolve(file)), {
    line: parseInt(ln, 10) - 1,
    character: parseInt(col, 10) - 1,
  });
  if (!defs.length) return console.log("nothing resolves at that position");
  for (const d of defs) console.log(loc(d));
} else {
  console.error(`unknown command '${cmd}'`);
  process.exit(2);
}

console.error(`\n[indexed ${files.length} files]`);
