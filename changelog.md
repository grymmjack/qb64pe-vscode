# Change Log

All notable changes to the "QB64 PE" extension will be documented in this file.

## 0.20.12

- Debugger: **TYPE members now show their values** in the VARIABLES view, even for TYPEs that contain variable-length `AS STRING` members. Previously a single variable-length string (common as the first field) made every following member show `<?>`, because its size was unknown and broke the byte-offset chain. A variable-length string in a TYPE occupies a fixed 8-byte descriptor slot (verified against QB64PE), so offsets now stay correct and the numeric/fixed members read live. The string field itself shows `<string>` (its text lives outside the record and isn't readable by a raw byte read).
- Debugger: **hovering a variable in the editor shows its value while debugging** — including member paths (`CFG.FULLSCREEN`), array elements (`colW(3)`) and chains (`p.pos.x`), not just bare identifiers. (Added an evaluatable-expression provider so VS Code evaluates the whole expression under the cursor.)

## 0.20.11

- Editor: **colour chips + picker for QB64 colour calls.** `_RGB32`/`_RGBA32`/`_RGB`/`_RGBA` and `_HSB`/`_HSB32`/`_HSBA`/`_HSBA32` calls with integer-literal arguments now show an inline colour swatch; click it for the native colour picker, and the call is rewritten in place (function name and argument count preserved; HSB stays HSB). Works anywhere the call appears — inside `COLOR`, `LINE`, `PAINT`, `_PRINTSTRING`, etc. Calls with variable/expression arguments are left alone, and HSB uses QB64's exact ranges (H 0–360, S/B 0–100, HSBA alpha 0–100). Bare palette-index colours (e.g. `COLOR 15, 4`) have no fixed RGB and are not chipped.

## 0.20.10

- Debugger: **arrays now expand in the VARIABLES view.** A 1-D array whose bounds are literal in its `DIM`/`REDIM` (e.g. `DIM colW(10)`) is shown as an expandable node listing `colW(0)`, `colW(1)`, … `colW(10)` — no need to add a watch for each index. Elements are read live and shown in numeric order. Bounds are recovered from the source declaration (the runtime doesn't expose them) and `OPTION BASE` is honored, so out-of-bounds elements are never read. Dynamic (`REDIM a(n)`), multi-dimensional, and UDT arrays, or any array larger than `qb64pe.debug.arrayExpandLimit` (default 256), keep the previous "Watch name(index)" hint.

## 0.20.9

- Debugger: the debug UI now appears the **instant F5 is pressed**, before compilation — so you get immediate feedback (and see the "Flattened…/Compiling…" output live) instead of the panes only showing up after a stalled compile finishes. Previously the reveal was tied to the session-started event, which for QB64PE fires only after the compile completes. This applies to both `qb64pe.debug.focusRunDebugViewOnStart` and `qb64pe.debug.focusDebugConsoleOnStart`.

## 0.20.8

- Formatter: keyword casing (`qb64pe.formatMode` with `isFormatEnabled` on) now actually rewrites keyword case. It previously decided whether a token was a keyword by looking for a help file for it, so casing did nothing unless `qb64pe.helpPath` pointed at the right files. Casing now consults the built-in 774-keyword list directly (independent of help files), so `Upper Case`/`Lower Case`/`Mixed Case` apply reliably. (Hover/F1 also fall back to the bundled `help/` when `helpPath` is unset.)
- Debugger: made the F5 debug-console reveal more reliable (awaited, slightly longer delay, and it tries both focus commands) so the Debug Console actually shows when `qb64pe.debug.focusDebugConsoleOnStart` is on.
- Formatter: removed the "Do you want to start the long running process?" modal on files over 2000 lines. It popped on every format-on-save of a large file (even for the fast whitespace-only indent pass); responsiveness is handled by the editor's cancellation token instead. (Reminder: keyword casing/spacing is only applied when `qb64pe.isFormatEnabled` is on — it's off by default because it rewrites code, not just whitespace; `qb64pe.formatMode` picks the casing.)
- Debugger: F5 now starts the **QB64PE** debugger directly on a `.bas`/`.bi`/`.bm` file — no more "Select debugger" prompt. (The debugger is now declared as the default for the QB64PE language.)
- Keybindings: `Shift+Alt+L` now opens compilelog.txt (was the linter; the old `Ctrl+Alt+Shift+L` binding is removed). The linter no longer has a default keybinding — it was briefly on `Ctrl+Shift+L`, which is VS Code's built-in "Select All Occurrences of Find Match", so to avoid clobbering that default it's now run from the editor right-click menu or the Command Palette ("QB64PE: Lint"). Bind it to a key of your choice if you like. (The `Ctrl+Shift+L` lowercase-transform binding is also removed; `Ctrl+Shift+U` still uppercases.) Note: a matching entry in your personal keybindings.json overrides the extension's defaults.
- Debugger: on F5, optionally reveal the debug UI. Two independent toggles (both on by default): `qb64pe.debug.focusRunDebugViewOnStart` (Run and Debug sidebar view) and `qb64pe.debug.focusDebugConsoleOnStart` (Debug Console panel). When both are on, the Debug Console ends focused; revealing also un-hides a pane that was collapsed.
- New command **QB64PE: Align Source** (`qb64pe.alignSource`): column-aligns the active file (or the selected lines) — lines up `=` in assignment blocks, `AS` in TYPE/DIM declarations, `CASE "KEY":` inline assignments (two columns), `:` statement separators, and inline `'` comments. Each pass has its own on/off setting (`qb64pe.formatAlign*`), plus `qb64pe.formatAlignScope` (block vs section grouping) and `qb64pe.formatAlignGap`. Alignment is a deliberate command, **not** part of Format Document / format-on-save. (Ports the behaviour of the `align-qb64pe.py` tool; verified byte-for-byte identical across a 514-file corpus.)
- Fix: the formatter (keyword-casing/spacing pass) no longer mangles metacommands — e.g. `$CONSOLE:ONLY` is left intact instead of being rewritten to `$CONSOLE : ONLY` (which fails to compile). Metacommand lines (`$CONSOLE`, `$DYNAMIC`, `$ASSERTS:…`, `'$INCLUDE:'…'`, `$IF …`, etc.) are now detected via the shared lexer and skipped by the content pass, so no per-metacommand special-casing is needed.
- Fix: **Open compilelog.txt** now resolves the log under the QB64PE compiler/install path instead of a workspace-relative `./internal/temp/…` (which happened when `qb64pe.compilerPath` was empty), and it checks each `temp`/`temp1`…`temp9` folder actually contains the file before opening — so the fallback search works and you no longer get a phantom relative path.

## 0.20.4

- Debugger: the flattened `.debug.*` file no longer contains any `$INCLUDE` or `$INCLUDEONCE` metacommands. Every include is inlined, so the directives are dropped (replaced by blank lines that keep the line map exact, so breakpoints and stepping still line up). This prevents the compiler from re-expanding an include inside the already-flattened source.
- Linting: `GOTO`/`GOSUB` to a label defined only in a *different* routine is now flagged as `undefined-label` ("not defined in this scope"). QB64 labels are scoped to their SUB/FUNCTION (or module level), so a jump can only reach a label in the same scope — a common copy-paste bug that previously slipped through.

## 0.20.3

- Linting: the duplicate-definition check no longer flags a label name reused in a different scope. QB64 line labels are scoped to their SUB/FUNCTION (or module level), so the same label in two different routines is legal; only a repeat within the same scope is reported now.

## 0.20.2

- Debugger: sturdier first run on Windows/macOS — the produced executable is now found even when the compiler names it unexpectedly (falls back to scanning the build folder), and the connect-timeout message now points at the usual causes (missing , busy port, Windows firewall, or a too-short timeout on huge programs).

## 0.20.1

- Linting: log each index-diagnostics pass (file → problem count) to the QB64PE lint output channel, to help diagnose "no problems shown" reports.

## 0.20.0

- Help: new command **"QB64PE: Build Help Pages"** converts all of your installed QB64PE help into rendered pages once, so cross-page links in hover help and F1 pages actually open (previously a link like `[PSET](PSET.md)` pointed at the .txt source folder and failed). Hover/F1 links now resolve against that built folder. Run it once after setting qb64pe.installPath.

## 0.19.1

- Formatter: **Format Document now re-indents out of the box** (no setting required), and gains options mirroring the QB64PE IDE's "Code Layout" dialog:
  - `qb64pe.isFormatIndentEnabled` (default on) — auto-indent lines (leading whitespace only, never code).
  - `qb64pe.formatIndentSize` (default 0 = follow editor Tab Size) — spaces per indent level.
  - `qb64pe.formatIndentSubs` (default on) — indent SUB/FUNCTION bodies.
  - Keyword casing remains `qb64pe.formatMode` (Upper/Mixed/Lower/No Change); spacing remains `qb64pe.isFormatEnabled`.

## 0.19.0

- Formatter: **proper block indentation**. The document formatter now indents with a block-aware engine — SUB/FUNCTION, IF/ELSE/ELSEIF/END IF (single-line IF left alone), FOR/NEXT, DO/LOOP, WHILE/WEND, SELECT CASE/CASE/END SELECT, TYPE, DECLARE LIBRARY, and `$IF` metacommands all nest correctly, with continuation (`_`) lines indented and keywords inside strings/comments ignored. It only ever changes leading whitespace, so it can never alter code. Enable with `qb64pe.isFormatEnabled` (keyword casing still follows `qb64pe.formatMode`); runs on format / format-on-save.

## 0.18.0

- Linting: **live diagnostics as you type**, on by default. The index-driven linter (undefined SUB calls & labels, duplicate definitions, never-read locals) now updates while you edit — not just on save — shown as squiggles and Problems-pane entries, with no compile needed. New rule: **unresolved `$INCLUDE`** files are flagged. Toggle with `qb64pe.isIndexDiagnosticsEnabled`; the compiler lint (Ctrl+Alt+L) is unchanged and complementary.

## 0.17.1

- Debugger: keyword hover help (and symbol hovers) now keep working while debugging. Previously, hovering a keyword like PAINT during a debug session showed "<not in scope>" from the debugger, which overrode the normal hover. The debugger now defers to the language hover when the hovered word is not a debuggable value.

## 0.17.0

- Debugger: **cached builds**. When you start debugging and the source hasn't changed since the last run, the extension reuses the previous executable and variable manifest instead of recompiling — repeat debug sessions of large multi-file projects go from a long compile to near-instant. Detection is exact (byte-identical flattened source). Toggle with `qb64pe.debug.cacheBuild` (default on). The flattened temp file and its `.manifest` are kept next to your source as the cache.

## 0.16.2

- Debugger: colour-valued variables now show a readable hint. A variable whose name looks like a colour (`*color`, `fg`, `bg`, `clr*`) and whose value is a 32-bit `_RGB32`/`&HAARRGGBB` number is annotated, e.g. `fgColor = 4294638330  (#FAFAFA A:255)`, in the Variables and Watch panels. (VS Code's debug view can't render an actual colour swatch.)

## 0.16.1

- Debugger: fixed "LIBRARY not found" when debugging multi-file programs whose `$INCLUDE`d files use `DECLARE LIBRARY` with a header that sits next to the include (e.g. DRAW's `filedialog_platform`). Flattening now rewrites such a library spec to the absolute path of its original directory so the header stays findable; system libraries (no sibling header) are left unchanged.

## 0.16.0

- Debugger: **full multi-file debugging** (`$INCLUDE`). You can now set breakpoints, step, see the call stack, and inspect variables inside `.bi`/`.bm` include files — not just the main file. QB64PE only instruments the main module, so the extension flattens your whole `$INCLUDE` graph into the temporary file it compiles (honoring `$INCLUDEONCE`, nested includes and cycles) and maps every line back to its real file, so stops and breakpoints land in the correct source. This is something the QB64PE IDE's own debugger can't do. (The previous "breakpoints only work in the main module" limitation is gone.)

## 0.15.0

- Debugger: **conditional breakpoints and hit counts**. Right-click a breakpoint → Edit Breakpoint to add an Expression (`x > 5`, `count = 10`, `name$ = "hi"`) or a Hit Count (`5`, `>5`, `%3`). QB64PE's runtime has no native conditional breakpoint, so the adapter evaluates the condition on each hit (reading the variable's live value) and keeps running when it isn't met. Simple `variable op literal` conditions are supported; anything more complex falls back to stopping.

## 0.14.1

- Debugger: fixed TYPE variables showing `<UDT>` with no expander and `p.field` returning `<no such field>`. TYPE definitions and variable types are now read by parsing the program source directly instead of relying on the workspace index (which may not have indexed the file being debugged).

## 0.14.0

- Debugger: **TYPE variables and arrays**. A TYPE (UDT) variable is now expandable in the Variables panel — click to see each field's live value (nested TYPEs expand too), computed from the TYPE's packed byte layout. Array elements and TYPE fields can be inspected via the Watch panel and hovers: `balls(3)`, `grid(2,4)`, `player.score`, `enemy.pos.x`. (Arrays are read by index rather than auto-expanded, since the runtime doesn't expose array bounds — same model as the QB64PE IDE.) This completes live inspection (M3).

## 0.13.0

- Debugger: **live variable values**. The Variables panel now shows real values for scalar globals and the current routine's locals (INTEGER, LONG, SINGLE, DOUBLE, STRING, `_BYTE`, `_INTEGER64`, `_OFFSET`, and unsigned variants), plus a Constants scope with static CONST values. Hovering a variable and Watch expressions evaluate live too. Values are read via vwatch get-var requests, using the variable table the compiler emits in its generated C (decoded by the new `core/vwatchVars`). Arrays and TYPE variables are listed but not yet expanded (next).

## 0.12.7

- Debugger: fixed the session terminating on step-into. VS Code can send multiple stackTrace requests before the call stack arrives; the adapter held only the last one, leaving the earlier request unanswered so VS Code tore down the session. All pending stackTrace requests are now queued and answered.

## 0.12.6

- Debugger: fixed the toolbar staying in the running state (step/continue greyed) after a step — stops now report allThreadsStopped so VS Code switches to the paused controls. Added DAP-request logging to the trace.

## 0.12.5

- Debugger: log the reason the session ends (e.g. disconnect request, socket close, quit) and guard message dispatch so an exception is reported instead of silently ending the session. Diagnostics for the step-into teardown.

## 0.12.4

- Debugger: added a `qb64pe.debug.trace` setting (on by default) that logs the vwatch protocol exchange to the Debug Console, and removed a redundant per-stop request. Diagnostics for stabilizing stepping.

## 0.12.3

- Debugger: name the compiled executable `<name>.run` on Linux/macOS and `<name>.exe` on Windows, matching the common QB64PE convention (and detect whichever the compiler produced).

## 0.12.2

- Debugger: fixed "no executable was produced" on Linux/macOS. QB64PE writes the executable without a `.exe` extension on those platforms, so the debugger now names the output per-platform and detects whatever the compiler actually produced (with or without `.exe`) before launching it.

## 0.12.1

- Debugger: fixed F5 launching the terminal build & run instead of the debugger. The `initialConfigurations`/environment-picker path used a `command`-based config, which routed away from the DAP session; the default configuration is now the `program`-based debug config, and a dynamic configuration provider offers "QB64PE: Debug" on F5 so it starts the real debugger. Added connect/handshake/stop logging to the Debug Console. (Reminder: put breakpoints on executable lines — a bare `DIM` declaration emits no debug line and can't be hit.)

## 0.12.0

- Source-level debugger (`F5`)
  - A real Debug Adapter that bridges VS Code to QB64PE's own `vwatch` debugger. Set a breakpoint in your `.bas`, press `F5`, and execution stops on that line in the editor.
  - Stepping: step in / over / out (`F11` / `F10` / `Shift+F11`), continue, pause, stop, and jump-to-cursor ("set next line").
  - A real call stack across your SUBs/FUNCTIONs, mapped back to the source via the symbol index — including routines defined in `$INCLUDE` files (their frames resolve to the right file).
  - Works with no `launch.json`: the program is compiled with `$DEBUG` (auto-added to a temporary copy if missing, preserving line numbers) and run with the debugger hosting its `vwatch` connection. `Ctrl+F5` (Run Without Debugging) keeps the plain terminal build & run from 0.11.1.
  - New settings: `qb64pe.debug.basePort` (default 9000, matches the IDE's BaseTCPPort), `qb64pe.debug.autoAddDebug`, `qb64pe.debug.timeoutMs`. Breakpoints are enabled for the QB64PE language, and a "QB64PE: Debug" launch snippet is contributed.
  - Known limits (inherited from vwatch): breakpoints only bind on the main module's lines — breakpoints inside `$INCLUDE`d `.bi`/`.bm` files are shown unverified with a reason; and the Variables/Watch panel lists in-scope names + declared types (and real `CONST` values) but not live variable values yet (that needs a compiler-emitted variable manifest QB64PE does not produce). See the README "Debugging notes".
  - Implementation: a vscode-free `vwatch` protocol codec (`src/core/vwatchProtocol.ts`, 24 unit tests pinning the wire format) plus an inline `QB64DebugSession`. Full plan in `docs/DEBUGGER_PLAN.md`. Builds on debugger groundwork by LordDurus.

## 0.11.1

- Build & Run (F5)
  - Enabled the QB64PE debug launcher: press `F5` on a `.bas` to compile the current file with your `qb64pe.compilerPath` and run it in a terminal — no `launch.json` needed (a default "Build & Run" configuration is supplied). A `launch.json` with the `QB64PE` type still works for custom commands.
  - Fixed two bugs that kept this from working: the launch command referenced `${config:qb64pecompilerPath}` (missing dot, so the compiler path never substituted), and the debug adapter was registered for type `qb64pe` while the contributed debugger is `QB64PE`.
  - Note: this builds and runs; it is not a source-level (breakpoint) debugger. For step debugging, use QB64PE's own `$DEBUG` metacommand.

## 0.11.0

- Language features (all driven by a new workspace-wide symbol index that follows `$INCLUDE` chains and understands scope)
  - Go to Definition (`F12`) now resolves the real declaration — locals, parameters, `SHARED`/module variables, SUBs/FUNCTIONs (with or without their type sigil), TYPEs, TYPE fields (`p.pos.x`), CONSTs and labels — across included files. `'$INCLUDE:'…'` and `$EXEICON:'…'` lines still jump to the file.
  - Find All References / Peek References: whole compilation unit, never inside comments or strings, and same-named locals in other routines are not counted.
  - Rename Symbol (`F2`): across all files of the program; keeps each call site's spelling and refuses a rename that would change the type sigil.
  - Document highlights: occurrences of the symbol under the cursor (writes vs reads).
  - Outline / breadcrumbs: real hierarchy — routines contain their parameters and locals, TYPEs their fields; includes and labels listed; ranges follow the cursor.
  - Go to Symbol in Workspace (`Ctrl+T`) for SUB/FUNCTION/TYPE/CONST.
  - Block-aware folding: SUB/FUNCTION, TYPE, DECLARE LIBRARY, `IF…END IF`, `SELECT…END SELECT`, `DO…LOOP`, `FOR…NEXT`, `WHILE…WEND`, `$IF…$END IF` and comment blocks.
  - Semantic highlighting of user-defined routines, types, variables, parameters, fields and labels (declarations, reads and writes distinguished).
  - Call Hierarchy (incoming/outgoing calls) for SUBs and FUNCTIONs, across included files; module-level code appears as the file.
  - Opt-in index diagnostics (`qb64pe.isIndexDiagnosticsEnabled`, off by default): undefined SUB calls and `GOTO`/`GOSUB` labels, duplicate SUB/FUNCTION/TYPE/CONST/label definitions, and never-read locals — no compile needed.
- Completion
  - Member completion: typing `variable.` offers the fields of its TYPE (nested UDTs too).
  - In-scope user symbols are ranked first and win over same-named keywords; the list is complete so VS Code's fuzzy matching works; documentation loads lazily (faster activation).
- Hover / signature help
  - Keyword hover help is now converted live from your installed QB64PE wiki source (`<installPath>/internal/help/*.txt`) and cached (in memory and on disk, re-converted only when QB64PE updates), so it always matches your installed version. Falls back to the bundled help when no install is found; toggle with `qb64pe.isLiveHelpEnabled`. The live conversion fixes the bundled set's defects: type sigils are no longer mangled (`LEFT$` not `LEFT\$`) and coloured example output is preserved.
  - `F1` (and Ctrl/Alt+click when enabled) open the same live-converted page in a Markdown preview, falling back to the bundled help, then the online wiki.
  - Hover shows the declaration, docs, parameters (by value/reference), TYPE members and location; works for parameters, fields, labels and `DECLARE LIBRARY` routines.
  - Signature help understands type sigils and statement-style SUB calls (`Show a, b`).
- Parser
  - Handles `_` line continuation, `:` multi-statement lines, type sigils (`$ % & ! # && ~%`), `DIM a AS T, b AS U` / `DIM AS T a, b`, `STRING * n`, `_UNSIGNED …`, `REDIM _PRESERVE`, CONST lists, labels (named and numeric), `DECLARE LIBRARY` blocks, TYPE fields, and implicit variables (first assignment / `FOR`).
- Fixes
  - The language `wordPattern` was invalid (VS Code had silently fallen back to its default); it now also includes type sigils so `name$`/`count%` are single words.
  - The TODO view is refreshed by its own listener instead of as a side effect of building the outline.
- Development
  - `npm test`: mocha unit tests for the vscode-free parsing core (`src/core`), fixtures under `test/fixtures`, plus a sweep over a QB64PE source checkout when available.

## 0.10.9 (skipped .8 somehow - _shrug_)

- Enhancements
  - Made keyword help lookup for hover provider case insensitive.

## 0.10.7

- Enhancements
  - **NEW: Intelligent Code Completion** - CompletionItemProvider with 500+ QB64PE keywords
    - Complete database of modern QB64PE functions including all underscore-prefixed functions
    - Context-aware suggestions with smart filtering
    - Detailed documentation and usage examples for each keyword
    - Support for graphics, sound, input, memory, and file I/O functions
  - **NEW: Inline Code Templates** - InlineCompletionItemProvider for multi-line patterns
    - Game development templates (game loops, graphics setup, input handling)
    - Modern QB64PE code patterns using current best practices
    - Context-sensitive pattern suggestions
    - Sprite and animation framework templates
  - Enhanced documentation with comprehensive completion provider guides
  - Updated package description to highlight new completion features

## 0.10.x (plan)

- Enhancements
  - Modify`tasks.json` to support QB64 PE.

## 0.10.6

- Enhancements
  - Modified to support QB64PE v4.x.x

## 0.10.5

- Enhancements
  - Added markdown help that's been styled and improved
    - Link to markdown file in title
    - Link to QB64PE wiki (click the 📖)
    - Styled stand-alone markdown (the hover has limits but I've done my best)
    - All files were generated with https://github.com/grymmjack/qb64pe-wiki-to-markdown
      - This has undergone drastic changes to accommodate the vscode extension.
- Fixes
  - Fixed ASCII chart offset issue
  - Fixed all known typos and spelling errors
  - Fixed stripping of `$` from help file parser

## 0.10.4

- Enhancements
  - Fixed new markdown hover help for QB64 PE keywords up to version `3.13.1`
    - Now works with `config.helpPath`
  - For how the markdown is generated look here: https://github.com/grymmjack/qb64pe-wiki-to-markdown

## 0.10.3

- Enhancements
  - Add new markdown hover help for QB64 PE keywords up to version `3.13.1`
  - Modified wiki search online help to work with qb64phoenix.com/wiki/

## 0.10.2

- Enhancements
  - Improved syntax highlighting for variables, subs, and functions `3.13.1`

## 0.10.1

- Enhancements
  - Added new syntax highlighting QB64 PE keywords up to version `3.13.1`

## 0.10.0

- Enhancements
  - Added new default setting to make sticky scroll use indentation levels.
  - Changed every instance that used QB64 to QB64PE.

---

# QB64 PE Fork starts here

---

## 0.9.x and lower:

> Refer to the QB64Official/vscode repo for older historical changes:

See: https://github.com/QB64Official/vscode/releases/README.md
See: https://github.com/QB64Official/vscode/changelog.md
