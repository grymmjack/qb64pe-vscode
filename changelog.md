# Change Log

All notable changes to the "QB64 PE" extension will be documented in this file.

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
