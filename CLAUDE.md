# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **VS Code language extension** for QB64PE (Phoenix Edition), a modern QBasic. It adds
completion, hover/help, go-to-definition, references, rename, outline, folding, semantic
highlighting, formatting, linting, and F5-style build/run for `.bas`, `.bi`, `.bm`, and `.inc`
files. It is not a compiler — it drives the user's installed QB64PE compiler for building and
linting. Published to open-vsx.org as `grymmjack/qb64pe`.

## Commands

```bash
npm run esbuild          # Dev build → out/main.js (with sourcemap). This is the entry point (package.json "main").
npm run esbuild-watch    # Rebuild on change while developing
npm run compile          # tsc: type-checks everything and emits out/ (tests run from there)
npm test                 # tsc, then mocha over out/test/**/*.test.js (the vscode-free core)
npx mocha out/test/core/parser.test.js          # one test file (after npm run compile)
npx mocha out/test/core/queries.test.js -g "member"   # one test by name
npm run test:integration # Extension Development Host smoke test of every provider (downloads VS Code to .vscode-test/ once;
                         #   prefix with `xvfb-run -a` to keep it off your screen; the runner clears ELECTRON_RUN_AS_NODE)
npm run package          # Produce the installable .vsix with @vscode/vsce (contents governed by .vscodeignore)
```

- **Run/debug the extension**: press F5 in VS Code (uses `.vscode/launch.json`) to launch an
  Extension Development Host.
- **Tests**: `npm test` covers `src/core` (no `vscode` dependency); `src/test/integration/` drives
  the real extension host via `vscode.execute*Provider` commands. Fixtures live in
  `test/fixtures/` (see its README: each file targets one syntax area). `corpus.test.ts`
  parses every `.bas/.bi/.bm` in a QB64PE source checkout at `../qb64pe` (or `$QB64PE_SRC`)
  as a crash detector and is skipped when absent.
- Node 26+ needs mocha ≥ 11 (older mocha's yargs crashes) — already pinned.

## Architecture

Two layers:

1. **`src/core/` — vscode-free engine** (unit-tested, plain Node):
   - `lexer.ts` — `scanLine()` masks strings/comments (same-length mask so regex columns map
     to source), finds statement-separating `:`, keeps metacommand lines (`$CONSOLE:ONLY`,
     `'$INCLUDE:'x'`) whole; `identifierAt()` is sigil-aware (`count%`, `name$`, `x~&&`).
     Every other module goes through it — nothing should regex raw lines for code.
   - `parser.ts` — `parseFile(text)` → symbols + `$INCLUDE` directives. Joins `_`
     continuations into logical lines, splits `:` statements, matches anchored patterns for
     SUB/FUNCTION (+`endLine`), TYPE (+`members` as `FIELD`), DIM/REDIM/STATIC/COMMON lists,
     CONST lists, labels, DECLARE LIBRARY (`isExternal`), implicit variables (first
     assignment / FOR, `isImplicit`). Still a pattern matcher, not a grammar.
   - `symbols.ts` — the `QB64Symbol` model (type, scope LOCAL/MODULE/GLOBAL, line/endLine,
     file, dataType, parameters, members, flags).
   - `index.ts` — `SymbolIndex`: all files' symbols + lines, name maps (exact and
     sigil-stripped), and the `$INCLUDE` graph (`includesOf`/`includedByOf`, `closure`,
     `rootsOf`, `unitOf` = every file compiled into the same program). Incremental
     `setFile`/`removeFile`/`loadMany`; include resolution and file loading are injected.
   - `queries.ts` — the language-server brain: `resolveAt` (scope precedence: TYPE members →
     FUNCTION return name → parameters → locals → this file → include closure → rest of unit
     → sigil-insensitive routine fallback → workspace), member chains (`a.b.c`),
     `findDefinition`, `findOccurrences` (re-resolves every hit; declaration/write/read),
     `symbolsInScope` (completion candidates), `memberContextAt`, `searchSymbols`.
   - `wikitext.ts` converts a QB64PE wiki page (MediaWiki source) to the bundled help's
     markdown shape; `helpFiles.ts` decodes the mangled help filenames. Together they back
     live hover help.
   - `outline.ts`, `folding.ts`, `semantic.ts`, `rename.ts`, `callHierarchy.ts`,
     `diagnostics.ts`, `format.ts` — feature models (outline tree, folding ranges, semantic
     tokens, rename edits, call hierarchy, opt-in diagnostics, Markdown/labels) built on the
     above. `keywords.ts` holds the 774-entry keyword list (`isKeyword`) used by completion
     and by the diagnostics to tell a built-in statement from a user SUB call.

2. **`src/providers/` — thin VS Code adapters.** `WorkspaceSymbolIndex` owns the one
   `SymbolIndex` (workspace scan, debounced dirty-buffer indexing, file watcher, renames);
   providers call `ensureDocument(document)` first, then a core query, then map with
   `convert.ts`. `extension.ts` `activate()` creates the index and registers every provider
   and command. Adding a language feature = a core module with tests + a small provider +
   one `register*` call.

Other pieces: hover keyword help is served by `providers/HelpService.ts`, which converts the
user's *installed* QB64PE wiki source (`<installPath>/internal/help/*.txt`) via `core/wikitext`
and caches it (memory + globalStorage by mtime), falling back to the bundled `help/*.md`
snapshot (read from the extension's own `help/`, so it works without `helpPath` set). The shared
hover stylesheet is `media/hover.css`. `TokenInfo.ts` still resolves **built-in keyword** help for
F1 from the ~1050 offline wiki `.md` files in `help/` (case-insensitive, tries sigil/underscore variants; falls back to the
online wiki). Syntax highlighting is the TextMate grammar in `syntaxes/`
(semantic tokens only cover user-defined names, so the two do not fight). `lintFunctions.ts`
shells out to the compiler and parses its output into diagnostics. `todoFunctions.ts` feeds
the TODO view. `decoratorFunctions.ts` uses the index to bold routine names.

## Conventions & gotchas

- **User must configure paths**: `qb64pe.installPath`, `qb64pe.helpPath`, `qb64pe.compilerPath`.
  Features that build/lint/open-help degrade gracefully when these are unset — preserve that.
- **All settings live under the `qb64pe.*` namespace** in `package.json` `contributes.configuration`.
- QB64PE specifics the code relies on: identifiers are case-insensitive; the type sigil is part
  of a variable's identity but routines may be called without it; `_`-prefixed names are
  keywords; `$INCLUDE` is textual inclusion (a `.bi` shares scope with its includer);
  strings have no escapes; `REM` only comments at statement start; metacommands' `:`/`'` are
  not separators.
- Paths: `normalizePath()` keys the index (absolute, case-folded on Windows); compare files
  through `WorkspaceSymbolIndex.keyOf()`, never raw `fsPath`. Backslashes in include paths
  are normalized to `/`.
- `language-configuration.json` `wordPattern` includes sigils on purpose (`title$` is one word).
- Version bumps go in `package.json`; release notes go in **`changelog.md`** (the
  `.vscode/tasks.json` "changelog" task that copies from `releases/` is stale — there is no
  `releases/` directory).
