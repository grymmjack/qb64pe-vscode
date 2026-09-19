# QB64PE (Phoenix Edition) for Visual Studio Code

A Visual Studio Code extension that turns VS Code into a full IDE for
[QB64 PE](https://www.qb64phoenix.com): smart editing, live help, linting,
formatting, and a real source-level debugger.

> This fork was created with permission from LordDurus to enhance and extend the
> VS Code extension to support QB64PE.

**Get it from open-vsx.org:** https://open-vsx.org/extension/grymmjack/qb64pe

---

## Contents

- [Install & configure](#install--configure)
- [Features at a glance](#features-at-a-glance)
- [Language intelligence](#language-intelligence)
- [Hover help & F1 help](#hover-help--f1-help)
  - [Preparing offline help](#preparing-offline-help)
- [Live linting](#live-linting)
- [Formatting](#formatting)
- [Debugging](#debugging)
- [Documenting your own code](#documenting-your-own-code)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Settings reference](#settings-reference)
- [Requirements, bugs, license](#requirements)

---

## Install & configure

1. Install [QB64 PE](https://www.qb64phoenix.com).
2. Install this extension (from open-vsx, or a `.vsix` via **Extensions → … → Install from VSIX**).
3. Point the extension at your QB64PE install. Open **Settings** and set:

| Setting | What it is |
|---|---|
| `qb64pe.installPath` | Your QB64PE folder (the one containing the compiler and `internal/help`). |
| `qb64pe.compilerPath` | The QB64PE compiler executable (used for building, linting and debugging). |
| `qb64pe.helpPath` | *(optional)* An explicit help folder, if not under `installPath`. |

Most features degrade gracefully when these are unset, but building, linting,
debugging and live help need them.

---

## Features at a glance

- **Language intelligence** — completion, hover, go-to-definition, references, rename, outline, folding, semantic highlighting, call hierarchy, workspace symbols. Everything follows `$INCLUDE` chains and understands QB64PE scope.
- **Live help** — keyword help converted from your installed QB64PE wiki, on hover and on `F1`, with clickable cross-page links.
- **Live linting** — as-you-type problems (undefined subs/labels, duplicate definitions, unread locals, missing includes), no compile required.
- **Formatting** — block indentation + keyword casing, mirroring the QB64PE IDE's "Code Layout" options.
- **Source-level debugger** — breakpoints, stepping, call stack, and live variable inspection across your whole multi-file program.

---

## Language intelligence

Powered by a workspace-wide symbol index that follows `$INCLUDE` chains and
understands scope (locals, parameters, `SHARED`, module level, TYPE members):

- **Go to Definition** (`F12`) — locals, parameters, SUB/FUNCTION (with or without sigil), TYPEs, TYPE fields (`p.pos.x`), CONSTs, labels, `DECLARE LIBRARY` routines, and `'$INCLUDE:'…'` / `$EXEICON:'…'` files.
- **Find All References / Peek References** — across every file of the program, never inside comments or strings.
- **Rename Symbol** (`F2`) — across the whole program, keeping type sigils correct.
- **Completion** — 500+ keywords plus your in-scope symbols (ranked first), and member completion (`variable.` lists the TYPE's fields).
- **Signature help**, **document highlights** (reads vs writes), **Outline/breadcrumbs**, **Go to Symbol in Workspace** (`Ctrl+T`), **Call Hierarchy**, **block folding**, and **semantic highlighting** of your own names.

---

## Hover help & F1 help

- **Hover** a keyword to see its help inline.
- **`F1`** opens the full help page for the keyword under the cursor.
- **`Ctrl+F1`** opens the alphabetical keyword list; **`Shift+F1`** the by-usage list.

Help is **converted live from your installed QB64PE wiki source**
(`<installPath>/internal/help/*.txt`) so it always matches your version, cached
so it's fast, and it falls back to a bundled snapshot (and then the online wiki)
when no install is found. Toggle with `qb64pe.isLiveHelpEnabled`.

### Preparing offline help

Help pages link to each other (e.g. `PSET` links to `POINT`). For those
**cross-page links to open**, the linked pages must already be rendered. Do this
once, like the QB64PE IDE's "download help":

1. Make sure `qb64pe.installPath` is set (so the `.txt` help source is found).
2. Open the Command Palette (`Ctrl+Shift+P`) → **“QB64PE: Build Help Pages”**.
3. A progress bar renders every help page to markdown once.

After that, clicking a link in any hover or `F1` page opens that page. You only
need to re-run it when you update QB64PE (to pick up new/changed help).

> Individual pages are also rendered on demand when you hover/`F1` them, so help
> works without this step — building just makes *every* cross-link resolve.

---

## Live linting

Problems are reported **as you type**, with no compilation, as squiggles and
Problems-pane entries. It catches:

| Rule | Severity | Example |
|---|---|---|
| Undefined `GOTO`/`GOSUB` label | error | `GOTO NoSuchLabel` |
| Call to an undefined SUB | warning | `MysterySub 1, 2` |
| Duplicate SUB/FUNCTION/TYPE/CONST/label | error | two `SUB Draw` |
| Local never read | hint (faded) | `DIM t: t = 1` (never used) |
| Unresolved `$INCLUDE` | warning | `'$INCLUDE:'missing.bi'` |

It is deliberately conservative (it prefers missing a problem to a false one)
and understands includes, builtins, assignments, `FOR` counters, TYPE fields and
`DECLARE LIBRARY` prototypes, so those are not flagged.

- On by default; toggle with **`qb64pe.isIndexDiagnosticsEnabled`**.
- This is *not* a syntax checker — for full compiler errors run the compiler lint
  from the Command Palette (**“QB64PE: Lint”**) or the editor right-click menu (or
  enable `qb64pe.isLintOnSaveEnabled`).

---

## Formatting

**Format Document** (`Shift+Alt+F`), or format-on-save, tidies your code. It has
two independent parts, mirroring the QB64PE IDE's *Code Layout* dialog:

**Indentation** (safe — only ever changes leading whitespace, never code):

| Setting | IDE equivalent | Default |
|---|---|---|
| `qb64pe.isFormatIndentEnabled` | Auto Indent lines | on |
| `qb64pe.formatIndentSize` | Indent Spacing (0 = follow editor Tab Size) | 0 |
| `qb64pe.formatIndentSubs` | Indent SUBs and FUNCTIONs | on |

It nests `SUB`/`FUNCTION`, block `IF`/`ELSE`/`ELSEIF`, `FOR`, `DO`, `WHILE`,
`SELECT CASE`/`CASE`, `TYPE`, `DECLARE LIBRARY` and `$IF` blocks, leaves
single-line `IF`s alone, indents continuation (`_`) lines, and ignores keywords
inside strings and comments.

**Keyword casing & spacing** (opt-in, rewrites code text):

| Setting | IDE equivalent | Default |
|---|---|---|
| `qb64pe.isFormatEnabled` | Auto Single-spacing | off |
| `qb64pe.formatMode` | Show Keywords as UPPER / Mixed / lower / No Change | Lower Case |

---

## Debugging

A real source-level debugger that bridges VS Code to QB64PE's own `vwatch`
debugger. **No `launch.json` needed.**

### Quick start

1. Set `qb64pe.compilerPath`.
2. Click in the gutter to set a breakpoint on an executable line.
3. Press **`F5`** (choose **“QB64PE: Debug”** if prompted).

The extension compiles your program with `$DEBUG` (added automatically to a
temporary copy if you don't have it — your line numbers are preserved), runs it,
and stops at your breakpoint. Use **`Ctrl+F5`** (Run Without Debugging) for a
plain build & run in the terminal.

### Stepping & call stack

Step **In** (`F11`), **Over** (`F10`), **Out** (`Shift+F11`), Continue (`F5`),
Pause, Stop, and right-click **Jump to Cursor**. The **Call Stack** shows your
SUB/FUNCTION frames mapped to the right file and line.

### Inspecting variables

While stopped, the **Variables** panel shows live values:

- **Locals** (current routine), **Module & Globals**, and **Constants**.
- Scalars of every type (INTEGER, LONG, SINGLE, DOUBLE, STRING, `_BYTE`, `_INTEGER64`, `_OFFSET`, `_FLOAT`, unsigned variants).
- **TYPE variables expand** to show their fields (nested TYPEs too).
- **Colour-looking values** get a readable hint, e.g. `fgColor = 4294638330  (#FAFAFA A:255)`.
- **Hover** a variable in the editor, or use the **Watch** panel.
- **Arrays** are read by index from Watch/hover: `balls(3)`, `grid(2, 4)`, and members like `player.score`.

### Conditional & hit-count breakpoints

Right-click a breakpoint → **Edit Breakpoint** and add:

- an **Expression** — e.g. `x > 5`, `count = 10`, `name$ = "hi"` (stops only when true), or
- a **Hit Count** — e.g. `5`, `>5`, `%3`.

### Multi-file (`$INCLUDE`) debugging

Breakpoints, stepping, the call stack and variables all work **inside your
`.bi`/`.bm` include files**, not just the main file — the extension flattens your
whole `$INCLUDE` graph before compiling and maps every line back to its real
file. (This is something the QB64PE IDE's own debugger can't do.)

### Faster repeat runs (cached builds)

If nothing changed since your last debug run, the extension **reuses the previous
build instead of recompiling** — repeat sessions of large projects start almost
instantly. Exact detection (any source change recompiles). Toggle with
`qb64pe.debug.cacheBuild`.

### Debug settings

| Setting | Default | Meaning |
|---|---|---|
| `qb64pe.debug.basePort` | 9000 | TCP port the debugger hosts on. |
| `qb64pe.debug.autoAddDebug` | on | Add `$DEBUG` to a temp copy if missing. |
| `qb64pe.debug.timeoutMs` | 15000 | Wait for the program to connect back. |
| `qb64pe.debug.cacheBuild` | on | Reuse the build when source is unchanged. |
| `qb64pe.debug.trace` | on | Log the DAP ↔ vwatch exchange to the Debug Console. |

### Known limits

- Breakpoints bind on **executable** lines; a bare declaration (e.g. `DIM x`) has no code to stop on.
- Arrays are inspected **by index via Watch** (`arr(i)`) because the runtime doesn't expose array bounds.
- Setting a variable's value from the panel, and skip-line decorations, aren't implemented yet.

---

## Documenting your own code

Comment lines directly above a `SUB`, `FUNCTION`, `TYPE` or `CONST` become its
hover/completion documentation, and `' @param name description` lines document
parameters:

```QB64PE
' Moves the player and returns the new x position.
' @param p the player record
' @param dx horizontal delta
FUNCTION MovePlayer% (p AS Player, dx AS INTEGER)
```

---

## Keyboard shortcuts

Shortcuts this extension adds (active while a QB64PE editor is focused). You can
change any of them in **File → Preferences → Keyboard Shortcuts** (search
"QB64PE"); a matching entry in your personal `keybindings.json` always wins.

| Shortcut | Action |
|---|---|
| `F1` | Help for the keyword under the cursor |
| `Ctrl+F1` | Keyword index — alphabetical |
| `Shift+F1` | Keyword index — by usage |
| `Shift+Alt+L` | Open `compilelog.txt` |
| `Ctrl+Alt+Shift+F5` | Debug: **Force Rebuild** (recompile even when the build cache is on) |
| `Alt+Q` | Open the current file in the QB64PE IDE |
| `Ctrl+Shift+U` | Uppercase the selection |
| `Ctrl+F2` | Focus the Outline view |

These run from the **Command Palette** (`Ctrl+Shift+P`, type "QB64PE") or the
editor right-click menu — bind them to keys if you like: **Align Source**,
**Lint**, **Build Help Pages**, **Remove line numbers**, **Renumber lines**.

Handy built-in VS Code shortcuts that work with this extension:

| Shortcut | Action |
|---|---|
| `F5` / `Ctrl+F5` | Start Debugging / Run Without Debugging |
| `Shift+F5` / `Ctrl+Shift+F5` | Stop / Restart debugging |
| `F9` · `F10` · `F11` · `Shift+F11` | Toggle breakpoint · Step Over · Step In · Step Out |
| `F12` · `Ctrl+T` | Go to Definition · Go to Symbol in Workspace |
| `Shift+Alt+F` · `Ctrl+Shift+B` | Format Document · Build the current file |

> Note: `F1` opens QB64 help instead of the Command Palette while a `.bas` file
> is focused; use `Ctrl+Shift+P` for the palette. Colour calls (`_RGB32`, `_HSB32`,
> …) show an inline swatch when `editor.colorDecorators` is on.

---

## Settings reference

All settings live under the `qb64pe.*` namespace (Settings → search "QB64PE").
The most-used ones:

- **Paths:** `installPath`, `compilerPath`, `helpPath`
- **Help:** `isLiveHelpEnabled`, `isOpenOnLineHelpEnabled`, `isOpenHelpInEditModeEnabled`
- **Linting:** `isIndexDiagnosticsEnabled`, `isLintOnSaveEnabled`
- **Formatting:** `isFormatIndentEnabled`, `formatIndentSize`, `formatIndentSubs`, `isFormatEnabled`, `formatMode`
- **Debugging:** `debug.basePort`, `debug.autoAddDebug`, `debug.timeoutMs`, `debug.cacheBuild`, `debug.trace`

Also: TODOs are collected in an Explorer view; `_RGB32`/`_HSB32` (and their
variants) colour calls show an inline swatch + picker. See
[Keyboard shortcuts](#keyboard-shortcuts) for the full key list.

---

## Requirements

- [QB64 PE](https://www.qb64phoenix.com) installed.
- Latest `.vsix` from the [releases](https://github.com/grymmjack/qb64pe-vscode) or open-vsx.

## Get started writing QB64PE

- [QB64PE Wiki](https://qb64phoenix.com/qb64wiki)

## Found a bug?

Please open an [issue](https://github.com/grymmjack/qb64pe-vscode/issues).

## License

MIT. Source at https://github.com/grymmjack/qb64pe-vscode, licensed under the
[MIT license](https://github.com/grymmjack/qb64pe-vscode/blob/main/LICENSE).

## Acknowledgments

- Based on work by [Lord Durus](https://github.com/grymmjack/qb64pe-vscode/commits?author=LordDurus), including the original debugger groundwork.
- Syntax/highlighting bases: [freebasic-vscode-extension](https://github.com/sorucoder/freebasic-vscode-extension), [VS Code VB grammar](https://github.com/microsoft/vscode/blob/main/extensions/vb/syntaxes/asp-vb-net.tmlanguage.json), [SWMF-grammar](https://github.com/svaberg/SWMF-grammar).
- Snippets adapted from [VS Code VB snippets](https://github.com/microsoft/vscode/blob/main/extensions/vb/snippets/vb.code-snippets).
- F5 build-&-run core from [f5anything](https://github.com/discretegames/f5anything).
- The `$INCLUDE` flattening approach for multi-file debugging builds on QBFLATTEN / MergeFile ideas by Steve McNeill and Rick Christy.
- TODO icon from [iconfinder](https://www.iconfinder.com/search?q=todo&price=free&style=outline&license=gte__1); decorations guided by [vscode.rocks](https://vscode.rocks/decorations/).
