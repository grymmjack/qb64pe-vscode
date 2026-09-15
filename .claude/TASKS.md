# QB64PE Debugger — implementation (branch: debugger)

## 🔨 NOW — doing right now
- (all items complete)


Bridge VS Code's Debug Adapter Protocol to QB64PE's `vwatch` debugger so
breakpoints, stepping, and the call stack work on the user's `.bas`/`.bi`/`.bm`
source. Ground truth: `~/git/qb64pe/internal/support/vwatch/vwatch.bm` (protocol)
and `source/ide/ide_methods.bas` (reference host). Plan: docs/DEBUGGER_PLAN.md.

Scope decision (verified from source): breakpoints, stop-on-line, stepping, and
call stack are fully deliverable (vwatch line == editor line for a single file;
call-stack frames arrive pre-formatted). Full Variables-panel *values* require
per-variable storage indexes that the QB64PE compiler assigns inline during its
own parse pass with no manifest file — so M3 ships the value-decode codec + DAP
scaffolding, and full live inspection is documented as needing a compiler-side
manifest. The user is testing manually as we go.

## M1 — connect, breakpoints, stop-on-line (the "it works" moment)
- [x] `src/core/vwatchProtocol.ts`: MKL$ FrameCodec, splitMessage/encode, interpret→typed messages, callstack+addressRead parse, decodeValue per QB64 type — done
- [x] `src/test/core/vwatchProtocol.test.ts`: 23 tests (framing/split/drain/interpret/callstack/addressRead/decodeValue) — all green
- [x] `src/providers/QB64DebugSession.ts`: LoggingDebugSession — initialize/launch(compile+spawn+host)/handshake/setBreakpoints/stopped/stackTrace(1 frame)/continue/pause/terminate/disconnect; compiles clean
- [x] folded routing into `DebugAdapterDescriptorFactory` (index-injected): `command`→terminal build&run, `program`→QB64DebugSession; config provider keeps Ctrl+F5/noDebug on terminal, F5 gets `program:${file}`; extension.ts passes workspaceIndex — compiles clean
- [x] `package.json`: launch attrs (program/compilerPath/stopOnEntry/port/autoAddDebug/timeoutMs), removed `command` from required, `QB64PE: Debug` snippet, `breakpoints` for QB64PE, `qb64pe.debug.*` settings; session reads settings as defaults — valid JSON, compiles
- [x] Build green: `npm run compile` clean, `npm test` 171 passing (23 new), `npm run esbuild` 303kb bundle — M1 committed b89c204

## M2 — stepping + full call stack
- [x] Stepping DAP handlers: next→step over, stepIn→step, stepOut→step out; gotoTargets/goto→`set next line`; supportsGotoTargetsRequest capability — compiles
- [x] Full call stack: on each stop request `current sub`+`call stack`, hold the DAP stackTrace until frames arrive, reverse to innermost-first, map each `subname` to file via `index.lookupBase`, live line for frame 0 — compiles

## M4 — $INCLUDE multi-file line mapping
- [x] Verified truth: vwatch only instruments main-module lines (inclinenumber=0 guard). So: main-file breakpoints verified; include-file breakpoints marked unverified w/ reason; call-stack frames for include-defined subs parse the `(file,line) Name` prefix and resolve via `index.closure`. Codec test added (24 passing)

## M3 — variables (honest scope)
- [x] scopes(Locals/Module&Globals)/variables/evaluate present in-scope symbols with declared types + real CONST values, labeled "no live value"; value-decode codec ready for when a manifest exists. Committed 894b215

## Finalize
- [x] README "Debugging notes" (honest limits) + `changelog.md` 0.12.0 + version bump 0.11.1→0.12.0 + plan status + CLAUDE.md debugger section. Committed 5a0e723
- [x] Packaged `qb64pe-0.12.0.vsix` (debugger code verified in bundle), restored dev bundle, all source committed on `debugger` (b89c204, 894b215, 5a0e723), delivered .vsix for manual testing
