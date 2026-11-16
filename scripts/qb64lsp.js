#!/usr/bin/env node
/**
 * qb64lsp — a Language Server Protocol server for QB64PE, for editors other
 * than VS Code (vim + coc.nvim, Neovim, Helix, Kate, Sublime LSP, …).
 *
 * It is a thin stdio adapter over the extension's vscode-free engine
 * (src/core), the same one `qb64ref` and the VS Code providers use, so
 * definitions / references / rename / outline match the editor exactly.
 *
 * Features: go to definition, references, document highlight, hover (symbol
 * signatures + bundled QB64PE keyword help), completion (scope-aware symbols,
 * TYPE members after `.`, keywords), rename (with QB64 name validation),
 * document + workspace symbols, folding, and opt-in diagnostics.
 *
 * Run (after `npm run compile`):   node scripts/qb64lsp.js --stdio
 * Installed build:                 npm run install:qb64lsp   →  ~/.local/bin/qb64lsp
 *
 * initializationOptions (all optional):
 *   { "diagnostics": false,   // true = publish the core lint (duplicates, undefined SUB/label, unused locals, missing $INCLUDE)
 *     "helpDir": "",          // folder of keyword help *.md (default: bundled help/ found next to this script or in ~/.local/share/qb64lsp/help)
 *     "maxHoverLines": 60 }
 */
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { fileURLToPath, pathToFileURL } = require("url");
const {
  SymbolIndex,
  createIncludeResolver,
  diskLoader,
  normalizePath,
  isQB64File,
} = require("../out/core/index");
const {
  resolveAt,
  findDefinition,
  findOccurrences,
  symbolsInScope,
  memberContextAt,
  searchSymbols,
  declarationOf,
} = require("../out/core/queries");
const { renameEdits, validateNewName } = require("../out/core/rename");
const { buildOutline } = require("../out/core/outline");
const { foldingRanges } = require("../out/core/folding");
const { diagnose } = require("../out/core/diagnostics");
const { symbolMarkdown, signatureLabel, kindLabel } = require("../out/core/format");
const { KEYWORDS } = require("../out/core/keywords");
const { lookupVariants } = require("../out/core/helpFiles");
const { identifierAt } = require("../out/core/lexer");

// ---------------------------------------------------------------- transport
let buffer = Buffer.alloc(0);
function send(msg) {
  const body = Buffer.from(JSON.stringify(Object.assign({ jsonrpc: "2.0" }, msg)), "utf8");
  process.stdout.write(`Content-Length: ${body.length}\r\n\r\n`);
  process.stdout.write(body);
}
const respond = (id, result) => send({ id, result });
const fail = (id, code, message) => send({ id, error: { code, message } });
const notify = (method, params) => send({ method, params });
const log = (m) => notify("window/logMessage", { type: 4, message: `[qb64lsp] ${m}` });

process.stdin.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  for (;;) {
    const sep = buffer.indexOf("\r\n\r\n");
    if (sep < 0) return;
    const header = buffer.subarray(0, sep).toString("ascii");
    const m = /Content-Length:\s*(\d+)/i.exec(header);
    if (!m) { buffer = buffer.subarray(sep + 4); continue; }
    const len = parseInt(m[1], 10);
    if (buffer.length < sep + 4 + len) return;
    const body = buffer.subarray(sep + 4, sep + 4 + len).toString("utf8");
    buffer = buffer.subarray(sep + 4 + len);
    let msg;
    try { msg = JSON.parse(body); } catch { continue; }
    try { dispatch(msg); }
    catch (e) {
      if (msg.id !== undefined) fail(msg.id, -32603, String(e && e.stack || e));
      else log(`error in ${msg.method}: ${e && e.stack || e}`);
    }
  }
});

// ---------------------------------------------------------------- state
let roots = [];
let options = { diagnostics: false, helpDir: "", maxHoverLines: 60, maxIndexFiles: 5000 };
const index = new SymbolIndex(createIncludeResolver(() => roots), diskLoader);
const open = new Set(); // keys of buffers the client has open
let helpIndex = null;

const keyOf = (uri) => normalizePath(fileURLToPath(uri));
const uriOf = (file) => pathToFileURL(file).href;
const loc = (o) => ({ uri: uriOf(o.file), range: o.range });

// A root that is far too big (e.g. a client that picked ~/git instead of the project) must not
// freeze the server: the walk stops at maxIndexFiles QB64 files / 20k folders, and then nothing is
// bulk-indexed. Open files and their $INCLUDE chains still load on demand, so definitions keep
// working; only workspace-wide references/symbols across unrelated files are lost.
const MAX_DIRS = 20000;
class TooBig extends Error {}
function walk(dir, out, budget, depth = 0) {
  if (depth > 25) return out;
  if (++budget.dirs > MAX_DIRS) throw new TooBig();
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    if (e.name.startsWith(".") || e.name === "node_modules") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out, budget, depth + 1);
    else if (e.isFile() && isQB64File(e.name)) {
      out.push(full);
      if (out.length > options.maxIndexFiles) throw new TooBig();
    }
  }
  return out;
}

function indexRoots() {
  const files = [];
  const budget = { dirs: 0 };
  try {
    for (const r of roots) walk(r, files, budget);
  } catch (e) {
    if (!(e instanceof TooBig)) throw e;
    const msg = `workspace root ${roots.join(", ")} is too large to index (over ${options.maxIndexFiles} QB64 files or ${MAX_DIRS} folders) - ` +
      "only open files and their $INCLUDEs are indexed. Check your client's root patterns.";
    notify("window/showMessage", { type: 2, message: `qb64lsp: ${msg}` });
    log(msg);
    return;
  }
  index.loadMany(files.map((f) => {
    try { return [normalizePath(f), fs.readFileSync(f, "utf8")]; } catch { return null; }
  }).filter(Boolean));
  log(`indexed ${files.length} QB64 file(s) under ${roots.join(", ") || "(no root)"}`);
}

function ensure(uri) {
  const key = keyOf(uri);
  if (!index.has(key)) {
    const text = diskLoader(key);
    if (text !== null) index.setFile(key, text);
  }
  return key;
}

// ---------------------------------------------------------------- help
function findHelpDir() {
  const candidates = [
    options.helpDir,
    process.env.QB64LSP_HELP_DIR,
    path.join(__dirname, "..", "help"),
    path.join(os.homedir(), ".local", "share", "qb64lsp", "help"),
  ];
  for (const c of candidates) if (c && fs.existsSync(c)) return c;
  return null;
}
function keywordHelp(token) {
  if (helpIndex === null) {
    helpIndex = new Map();
    const dir = findHelpDir();
    if (dir) {
      for (const name of fs.readdirSync(dir)) {
        if (name.toLowerCase().endsWith(".md")) helpIndex.set(name.slice(0, -3).toUpperCase(), path.join(dir, name));
      }
      log(`keyword help: ${helpIndex.size} pages from ${dir}`);
    } else log("keyword help: no help directory found");
  }
  for (const k of lookupVariants(token)) {
    const file = helpIndex.get(k);
    if (file) {
      try { return fs.readFileSync(file, "utf8"); } catch { return null; }
    }
  }
  return null;
}
/**
 * The bundled pages are written for VS Code's HTML-capable hover (a <style>
 * block, <blockquote> wrappers, relative .md links). Terminal clients render
 * plain Markdown, so strip that down to text + code fences.
 */
function cleanHelp(md) {
  return md
    .replace(/<style[\s\S]*?<\/style>\s*/gi, "")
    .replace(/<\/?(blockquote|div|span|center|p)\b[^>]*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\s*\[📖\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\((?!https?:)[^)]*\.md\)/g, "$1") // local cross-page links → plain text
    .replace(/^---\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
function trimMarkdown(md) {
  const clean = cleanHelp(md);
  const lines = clean.split(/\r?\n/);
  const max = options.maxHoverLines;
  return lines.length > max ? lines.slice(0, max).join("\n") + "\n\n…" : clean;
}

// ---------------------------------------------------------------- diagnostics
const SEVERITY = { error: 1, warning: 2, hint: 4 };
function publishDiagnostics(key) {
  if (!options.diagnostics) return;
  const list = diagnose(index, key).map((d) => ({
    range: d.range,
    severity: SEVERITY[d.severity] || 3,
    code: d.code,
    source: "qb64",
    message: d.message,
    tags: d.unnecessary ? [1] : undefined,
  }));
  notify("textDocument/publishDiagnostics", { uri: uriOf(key), diagnostics: list });
}
let diagTimer = null;
const pending = new Set();
function scheduleDiagnostics(key) {
  if (!options.diagnostics) return;
  pending.add(key);
  clearTimeout(diagTimer);
  diagTimer = setTimeout(() => {
    // an edit can change what other open files see (includes), so refresh them all
    for (const k of new Set([...pending, ...open])) publishDiagnostics(k);
    pending.clear();
  }, 250);
}

// ---------------------------------------------------------------- features
const COMPLETION_KIND = { SUB: 2, FUNCTION: 3, VARIABLE: 6, TYPE: 22, CONST: 21, LABEL: 18, FIELD: 5 };
const SYMBOL_KIND = { include: 2, type: 23, field: 8, const: 14, variable: 13, parameter: 13, label: 20, sub: 6, function: 12 };
const WS_SYMBOL_KIND = { SUB: 6, FUNCTION: 12, VARIABLE: 13, TYPE: 23, CONST: 14, LABEL: 20, FIELD: 8 };

function completionItem(s) {
  return {
    label: s.name,
    kind: COMPLETION_KIND[s.type] || 1,
    detail: s.type === "SUB" || s.type === "FUNCTION" ? signatureLabel(s) : `${s.dataType || ""} ${kindLabel(s)}`.trim(),
    documentation: { kind: "markdown", value: symbolMarkdown(s) },
  };
}

function outlineToSymbols(nodes) {
  return nodes.map((n) => ({
    name: n.name || "(unnamed)",
    detail: n.detail || undefined,
    kind: SYMBOL_KIND[n.kind] || 13,
    range: n.range,
    selectionRange: n.selectionRange,
    children: outlineToSymbols(n.children || []),
  }));
}

const handlers = {
  initialize(p) {
    const folders = (p.workspaceFolders || []).map((f) => fileURLToPath(f.uri));
    if (!folders.length && p.rootUri) folders.push(fileURLToPath(p.rootUri));
    else if (!folders.length && p.rootPath) folders.push(p.rootPath);
    roots = folders.filter((f) => f && f !== os.homedir() && f !== "/");
    Object.assign(options, p.initializationOptions || {});
    return {
      capabilities: {
        textDocumentSync: { openClose: true, change: 1, save: { includeText: false } },
        definitionProvider: true,
        declarationProvider: true,
        referencesProvider: true,
        documentHighlightProvider: true,
        hoverProvider: true,
        completionProvider: { triggerCharacters: ["."] },
        renameProvider: { prepareProvider: true },
        documentSymbolProvider: true,
        workspaceSymbolProvider: true,
        foldingRangeProvider: true,
      },
      serverInfo: { name: "qb64lsp", version: require("../package.json").version },
    };
  },
  initialized() { traceNote(`roots: ${JSON.stringify(roots)}`); indexRoots(); },
  shutdown() { return null; },
  exit() { process.exit(0); },

  "textDocument/didOpen"(p) {
    const key = keyOf(p.textDocument.uri);
    open.add(key);
    index.setFile(key, p.textDocument.text);
    scheduleDiagnostics(key);
  },
  "textDocument/didChange"(p) {
    const key = keyOf(p.textDocument.uri);
    const last = p.contentChanges[p.contentChanges.length - 1];
    if (last) index.setFile(key, last.text);
    scheduleDiagnostics(key);
  },
  "textDocument/didSave"(p) { scheduleDiagnostics(keyOf(p.textDocument.uri)); },
  "textDocument/didClose"(p) {
    const key = keyOf(p.textDocument.uri);
    open.delete(key);
    const disk = diskLoader(key);
    if (disk === null) index.removeFile(key); else index.setFile(key, disk);
    if (options.diagnostics) notify("textDocument/publishDiagnostics", { uri: p.textDocument.uri, diagnostics: [] });
  },

  "textDocument/definition"(p) {
    return findDefinition(index, ensure(p.textDocument.uri), p.position).map(loc);
  },
  "textDocument/declaration"(p) { return handlers["textDocument/definition"](p); },
  "textDocument/references"(p) {
    const res = resolveAt(index, ensure(p.textDocument.uri), p.position);
    if (!res || !res.symbol) return [];
    const incl = !p.context || p.context.includeDeclaration !== false;
    return findOccurrences(index, res.symbol, incl).map(loc);
  },
  "textDocument/documentHighlight"(p) {
    const key = ensure(p.textDocument.uri);
    const res = resolveAt(index, key, p.position);
    if (!res || !res.symbol) return [];
    return findOccurrences(index, res.symbol, true, [key])
      .filter((o) => o.file === key)
      .map((o) => ({ range: o.range, kind: o.kind === "read" ? 2 : 3 }));
  },
  "textDocument/hover"(p) {
    const key = ensure(p.textDocument.uri);
    const res = resolveAt(index, key, p.position);
    if (res && res.symbol) {
      return { contents: { kind: "markdown", value: symbolMarkdown(res.symbol) }, range: res.range };
    }
    const line = (index.get(key) && index.get(key).lines[p.position.line]) || "";
    const id = identifierAt(line, p.position.character);
    if (!id) return null;
    const md = keywordHelp(id.word);
    return md ? { contents: { kind: "markdown", value: trimMarkdown(md) } } : null;
  },
  "textDocument/completion"(p) {
    const key = ensure(p.textDocument.uri);
    const member = memberContextAt(index, key, p.position);
    if (member) return { isIncomplete: false, items: member.members.map(completionItem) };
    const items = symbolsInScope(index, key, p.position.line).map(completionItem);
    const have = new Set(items.map((i) => i.label.toUpperCase()));
    for (const k of KEYWORDS) if (!have.has(k.toUpperCase())) items.push({ label: k, kind: 14 });
    return { isIncomplete: false, items };
  },
  "textDocument/prepareRename"(p) {
    const res = resolveAt(index, ensure(p.textDocument.uri), p.position);
    if (!res || !res.symbol) return null;
    if (res.symbol.isExternal) return null; // DECLARE LIBRARY names live in C
    return { range: res.range, placeholder: res.word };
  },
  "textDocument/rename"(p) {
    const res = resolveAt(index, ensure(p.textDocument.uri), p.position);
    if (!res || !res.symbol) return null;
    const problem = validateNewName(res.symbol, p.newName);
    if (problem) throw Object.assign(new Error(problem), { lspCode: -32602 });
    const changes = {};
    for (const e of renameEdits(index, res.symbol, p.newName.trim())) {
      (changes[uriOf(e.file)] = changes[uriOf(e.file)] || []).push({ range: e.range, newText: e.newText });
    }
    return { changes };
  },
  "textDocument/documentSymbol"(p) {
    return outlineToSymbols(buildOutline(index, ensure(p.textDocument.uri)));
  },
  "workspace/symbol"(p) {
    return searchSymbols(index, p.query || "", 300).map((s) => {
      const d = declarationOf(index, s);
      return { name: s.name, kind: WS_SYMBOL_KIND[s.type] || 13, location: loc(d), containerName: s.parent || undefined };
    });
  },
  "textDocument/foldingRange"(p) {
    const entry = index.get(ensure(p.textDocument.uri));
    if (!entry) return [];
    return foldingRanges(entry.lines).map((r) => ({ startLine: r.startLine, endLine: r.endLine, kind: r.kind }));
  },
};

// QB64LSP_TRACE=<file>: append one line per message (method, id, handling time) for debugging
const traceFile = process.env.QB64LSP_TRACE || "";
function trace(msg, t0, note) {
  if (!traceFile) return;
  const ms = (Number(process.hrtime.bigint() - t0) / 1e6).toFixed(1);
  try { fs.appendFileSync(traceFile, `${new Date().toISOString()} ${msg.method}${msg.id !== undefined ? "#" + msg.id : ""} ${ms}ms${note ? " " + note : ""}\n`); } catch {}
}

function traceNote(text) {
  if (traceFile) try { fs.appendFileSync(traceFile, `${new Date().toISOString()} ${text}\n`); } catch {}
}

function dispatch(msg) {
  const t0 = process.hrtime.bigint();
  try { dispatchInner(msg); } finally { trace(msg, t0); }
}
function dispatchInner(msg) {
  const h = handlers[msg.method];
  if (msg.id === undefined) { if (h) h(msg.params || {}); return; } // notification
  if (!h) return fail(msg.id, -32601, `unhandled method ${msg.method}`);
  try {
    const r = h(msg.params || {});
    respond(msg.id, r === undefined ? null : r);
  } catch (e) {
    fail(msg.id, e.lspCode || -32603, e.message || String(e));
  }
}
