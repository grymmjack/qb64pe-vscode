# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **VS Code language extension** for QB64PE (Phoenix Edition), a modern QBasic. It adds
completion, hover/help, symbol navigation, formatting, linting, and F5-style build/run for
`.bas`, `.bi`, `.bm`, and `.inc` files. It is not a compiler — it drives the user's installed
QB64PE compiler for building and linting. Published to open-vsx.org as `grymmjack/qb64pe`.

## Commands

```bash
npm run esbuild          # Dev build → out/main.js (with sourcemap). This is the entry point (package.json "main").
npm run esbuild-watch    # Rebuild on change while developing
npm run compile          # tsc type-check only (no bundle emitted for the extension)
npx vsce package         # Produce the installable .vsix
```

- **Run/debug the extension**: press F5 in VS Code (uses `.vscode/launch.json`) to launch an
  Extension Development Host. The `build` task in `.vscode/tasks.json` chains changelog → esbuild → vsce.
- **Tests**: `@vscode/test-electron` and `mocha` are configured and `pretest` runs `compile`, but
  there is currently no `test/` directory or `test` script — there is no test suite to run.

## Architecture

`src/extension.ts` `activate()` is the single wiring point. It does three things:
registers **commands** (`extension.*`, declared in `package.json` `contributes.commands`/`keybindings`),
registers **language providers** against the `QB64PE` document selector (see `commonFunctions.getDocumentSelector`),
and sets up decorations, git-ignore creation, and the TODO tree view.

**Language providers** (`src/providers/`) implement VS Code's language-feature interfaces. They
share one `SymbolParser` instance created in `activate()`:
- `CompletionItemProvider` — autocomplete. The **500+ built-in keyword list is hardcoded as an
  array here** (~`this.keywords`); this is the place to edit the language keyword set, *not* the help files.
- `InlineCompletionItemProvider` — multi-line code templates (game loops, graphics setup, etc.).
- `HoverProvider`, `SignatureHelpProvider` — use `SymbolParser` + `TokenInfo` for docs.
- `DefinitionProvider`, `ReferenceProvider`, `DocumentSymbolProvider` — navigation over parsed symbols.
- `DocumentFormattingEditProvider` — keyword casing per the `qb64pe.formatMode` setting.

**`SymbolParser`** (`src/providers/SymbolParser.ts`) is the core intelligence. It is a
**line-by-line regex scanner, not a real parser**: it recognizes `SUB`/`FUNCTION`/`TYPE`/`CONST`
and `DIM`/`STATIC`/`COMMON`/`REDIM` declarations, tracks LOCAL/MODULE/GLOBAL scope, extracts
doc comments (leading `'` lines, `@param name desc`), caches results per file by mtime, and
follows `$INCLUDE` directives. Scope filtering in `getSymbolsInScope` mirrors QB64PE's own rules
(local vars only inside their SUB/FUNCTION, `SHARED` ⇒ GLOBAL). Edge cases stem from its regex nature.

**`TokenInfo`** (`src/TokenInfo.ts`) resolves keyword help. It builds a **case-insensitive cache
of the ~1050 offline wiki `.md`/`.txt` files in `help/`** and tries several spellings of a token
(underscore prefix `_X`, `$X`, `X$`) to find the right doc; falls back to the online wiki at
`qb64phoenix.com/qb64wiki` when offline help is missing. `help/` is the offline documentation
corpus — editing hover/F1 content means editing those files, not the keyword array.

**Linting** (`src/lintFunctions.ts`) shells out to the QB64PE compiler
(`<compilerPath> -c <file> -o <bin> -x -w`), then parses stdout: lines beginning with known
error prefixes (`Illegal`, `Syntax`, `Expected`, …) and `LINE n:` markers become
`DiagnosticSeverity.Error`, and lines containing `warning` become warnings, published to the
`QB64PE-lint` diagnostic collection.

## Conventions & gotchas

- **User must configure paths**: `qb64pe.installPath`, `qb64pe.helpPath`, `qb64pe.compilerPath`.
  `helpPath` defaults to the extension install dir on first activation. Features that build/lint/open-help
  degrade gracefully (or show errors) when these are unset — preserve that behavior.
- **All settings live under the `qb64pe.*` namespace** in `package.json` `contributes.configuration`.
  Adding a feature toggle means adding it there and reading it via `vscode.workspace.getConfiguration("qb64pe")`.
- **Syntax highlighting** is TextMate grammar in `syntaxes/qb64pe.tmLanguage.json`
  (+ `qb64pe-keywords.tmLanguage.json`), independent of the completion keyword array — keep the two in sync
  when adding keywords that should be both highlighted and completed.
- Windows-style backslash paths are normalized with `.replaceAll("\\", "/")` throughout; keep this
  when touching path handling since the extension runs cross-platform.
- Version bumps go in `package.json`; release notes live in `releases/` and are copied to `changelog.md`
  by the `changelog` build task.
