# QB64PE Debugger — Implementation Plan

**Goal:** a real, source-level debugger for QB64PE inside VS Code — breakpoints,
stepping, call stack, and variable/watch inspection in the user's `.bas`/`.bi`/`.bm`
source — implemented as a Debug Adapter that bridges VS Code's Debug Adapter
Protocol (DAP) to QB64PE's own `vwatch` debugger protocol.

**Audience:** maintainer + contributors working on this extension.

**Status:** shipped (v0.16.x). M1–M5 complete and validated on real programs
(including DRAW — 302 files / ~183k flattened lines). Core modules:
`vwatchProtocol.ts` (codec), `vwatchVars.ts` (generated-C variable table →
live values), `flatten.ts` ($INCLUDE flattening for full multi-file debugging),
`vwatchConditions.ts` (conditional/hit-count breakpoints); the inline DAP
session is `providers/QB64DebugSession.ts`. Delivered beyond the original plan:
full breakpoints/stepping/variables **inside `$INCLUDE`d files** (via flattening,
which the QB64PE IDE cannot do) and conditional breakpoints. Not yet done:
set-variable write-back and skip-line decorations (M5 stretch).

Two findings from the shipped `vwatch.bm`/`qb64pe.bas` refined the scope below:

1. **Per-line instrumentation is main-module only.** The `SUB_VWATCH` line call
   is emitted under `... AND inclinenumber(inclevel) = 0` — so breakpoints and
   stepping only bind on the launched file's lines (SUBs in that same file
   included). Breakpoints inside `$INCLUDE`d files can't stop (the official IDE
   has the same limit); we mark them unverified with a reason. Call-stack frames
   for routines defined in includes carry a `(file, line) Name` prefix, which we
   parse and resolve. This turned M4 from "breakpoints in includes" (impossible)
   into "handle the include boundary correctly."
2. **Live variable values need a compiler manifest that doesn't exist.** The
   `get global/local var` request requires each variable's `localIndex`,
   `storage`, `varType`, etc., which the compiler assigns *inline* during its own
   parse pass (`vWatchVariable` → `vwatch_local_vars[N]`) with no emitted file.
   So M3 ships the value-decode codec + scopes/variables/evaluate over the symbol
   index (names, declared types, real CONST values), but live values remain
   blocked on a QB64PE compiler change. The rest of this document is the original
   plan; these two notes are the reconciliation with reality.

---

## 1. Background: how QB64PE debugging actually works

QB64PE already ships a full source-level debugger — it's just wired to its own IDE,
not VS Code. When a program contains the `$DEBUG` metacommand, the compiler
auto-includes `internal/support/vwatch/vwatch.bi` + `vwatch.bm` (the "vwatch"
runtime). That instrumented program:

- reads the environment variable **`QB64DEBUGPORT`**,
- connects **as a TCP client** back to the debugger with
  `_OPENCLIENT("QB64IDE:" + port + ":localhost")`,
- and exchanges length-framed text/binary commands with whatever is hosting that
  port. In the QB64PE IDE that host is the IDE itself (`_OPENHOST("TCP/IP:…")`).

So the debuggee already tracks the current line, sub level, call stack, breakpoints,
skip lines, watchpoints and variable values **in terms of the user's source**. We do
not need to touch the generated C++ or a native debugger — we implement the *host*
side of the vwatch protocol and translate it to/from DAP.

> **Why not gdb?** QB64PE compiles `.bas` → generated C++ → native exe, so gdb
> *attaches*, but it debugs machine-generated C++ with no `#line` mapping back to the
> `.bas` and QB64-internal variable representations. It is the wrong layer for
> debugging program logic. vwatch already speaks in source terms.

---

## 2. Decision: build fresh, using two references

Build a new adapter in this extension's architecture. Do **not** fork the existing
attempt on `QB64Official/vscode@Debugger` (Durus's branch). Rationale:

- **Primary spec = `vwatch.bm` + `source/ide/ide_methods.bas` in the user's QB64PE.**
  This is ground truth for the exact protocol the installed compiler speaks; it
  cannot be out of date with itself.
- **Secondary reference = Durus's `src/debugAdapter.ts`.** A near-complete DAP
  implementation (all the request handlers, the compile/launch sequence, the
  DAP↔vwatch command mapping) — valuable as documentation, but built against an
  **older vwatch wire format** (STX/US/EOT + ASCII zero-padded length, `vwatch:ok`
  and `padding size:` negotiation) that the shipped vwatch no longer uses (it uses
  `MKL$` 4-byte binary length framing). It also has timing-hack `sleep`s after each
  write, couples protocol handlers to `activeTextEditor`, has no `$INCLUDE`/source
  mapping, stubs variable inspection, and ships no tests. Adopting it means
  rewriting the transport (the hard part) and untangling the coupling — usually
  slower than a clean build.

**What we take from Durus (as reference, not copy):** the DAP↔vwatch command mapping,
the single-thread / three-scope model, and the compile→spawn→host launch sequence.

**Our decisive advantage he lacked:** the `SymbolIndex` (`src/core/index.ts`) and the
vscode-free `src/core/` + unit-test pattern. The index gives real file/line/`$INCLUDE`
mapping (call-stack sub → actual file+line; breakpoints across included files), and
the protocol codec becomes a pure, unit-testable module.

---

## 3. Architecture

Two layers, matching the rest of the codebase:

1. **`src/core/vwatchProtocol.ts` — vscode-free, unit-tested.**
   - `FrameCodec`: incremental reader (accumulate a buffer, pull `MKL$`-framed
     messages) and writer (`encode(command, payload) → Buffer`). `MKL$` = 4-byte
     little-endian `LONG` length prefix.
   - `parseMessage(payload) → { command, value }` (split on the first `:`); helpers
     to pack/unpack the binary values (`MKL$`/`MKI$`/`_MK$`, and `_CV` for typed
     variable bytes — see §6).
   - Typed message model: `enum VWatchIn` (debuggee→host) and `enum VWatchOut`
     (host→debuggee) plus small parsed structs (`LineStop`, `CallStack`,
     `AddressRead`, `Watchpoint`, `Quit`, …).
   - No sockets, no `vscode` — just `Buffer`/string in, structs out.

2. **`src/providers/QB64DebugSession.ts` — the DAP adapter (VS Code side).**
   - An **inline** `DebugSession` (`vscode.DebugAdapterInlineImplementation`), so
     there is no TCP server for the VS Code↔adapter hop (simpler than Durus's nested
     servers). The only socket is the **debuggee host**.
   - Owns a `net.Server` on the chosen port, feeds incoming bytes to the `FrameCodec`,
     and maps parsed messages → DAP events; maps DAP requests → `VWatchOut` commands.
   - Uses the shared `SymbolIndex` (passed in) for source mapping: line ↔ file,
     call-stack sub name → declaring file+line, variable scope resolution.
   - `QB64DebugConfigurationProvider` supplies a default `launch` config (reuse the
     v0.11.1 pattern) and injects `$DEBUG` awareness.

Supporting pieces:
- `src/providers/QB64DebugAdapterFactory.ts` — `DebugAdapterDescriptorFactory`
  returning the inline session with the index injected. Registered in `extension.ts`
  for type `QB64PE` (replacing / extending the current build-&-run launcher; the two
  must coexist — see §7).
- Port allocation helper (find a free port at/above the configured base, default 9000).

Data flow:

```
VS Code ──DAP──▶ QB64DebugSession ──VWatchOut(MKL$)──▶ TCP ──▶ debuggee (vwatch)
        ◀─events─                  ◀──VWatchIn(MKL$)──        (compiled $DEBUG exe)
                         │
                         └── SymbolIndex (file/line/$INCLUDE/scope mapping)
```

---

## 4. Milestones

Each milestone is independently demoable and lands as its own PR. Every core change
comes with unit tests; the "does it really stop on my breakpoint" checks are manual
(need QB64PE + a GUI debuggee — see §8).

### M1 — Connect, breakpoints, stop-on-line  *(the "it works!" moment)*
- `vwatchProtocol.ts` framing codec + message parse/encode, fully unit-tested.
- `QB64DebugSession`: `initialize` (capabilities), launch = compile with the compiler
  path, ensure `$DEBUG` present (or inject per setting), spawn exe with
  `QB64DEBUGPORT`, host the TCP server; handshake (`me:`/`hwnd:` in, line count +
  breakpoint count/list + skip list + `run` out).
- `setBreakpoints` → breakpoint list; on `line number:`/`breakpoint:` emit a DAP
  `stopped` event; `stackTrace` returns at least the current frame mapped to the real
  file+line; current line highlights in the editor.
- `continue`, `pause` (`break`), `disconnect`/terminate (`quit:`).
- **Demo:** set a breakpoint, F5, it stops on that line in the editor.

### M2 — Stepping + full call stack
- `stepIn` (`step`), `next` (`step over`), `stepOut` (`step out`), run-to-cursor
  (`gotoTargets`/`goto` → `set next line` / `run to line`).
- Parse `call stack size:` + `call stack:` into full DAP stack frames, each mapped to
  file+line via the index (`current sub:` → the SUB/FUNCTION's location).
- **Demo:** step through a program with SUB calls and see the call stack.

### M3 — Variables + watch
- `scopes` (Locals / Globals / Constants) and `variables`: request values via
  `get global var` / `get local var`, decode `address read:` payloads (typed binary,
  §6) into displayable values; scope membership from the index (params/locals of the
  enclosing SUB; `SHARED`/module globals; `CONST`s).
- `evaluate` for the Watch panel and hovers; `watchpoint:` handling.
- **Demo:** inspect `a$`, `n%`, array elements, and a TYPE variable's fields while stopped.

### M4 — `$INCLUDE` multi-file mapping
- Map vwatch's flat line numbering across the compiled unit to the correct
  file+line using the index's include graph, so breakpoints/stepping/stack work in
  `.bi`/`.bm` includes, not just the main file. (Durus's attempt had no multi-file
  support — this is where the index pays off most.)

### M5 — Stretch / polish
- Skip-line decorations (vwatch supports `set skip line` / `clear skip line`).
- Set-variable from the Watch/Variables panel (`set global/local address` write path),
  if the protocol round-trips safely.
- "Auto-add `$DEBUG`" launch option; conditional breakpoints (if feasible via skip
  lines); a `qb64pe.debug.*` settings group.

---

## 5. package.json contributions

- **`debuggers`**: keep a `QB64PE` debug type. Decide the relationship with the
  existing 0.11.1 build-&-run launcher — likely two request kinds or a
  `noDebug`/`debug` split so plain "Run" stays the terminal launcher and "Debug"
  (with `$DEBUG`) uses the adapter. Do not regress F5 build-&-run.
- **`breakpoints`**: `{ "language": "QB64PE" }` so VS Code allows breakpoints in
  these files.
- **`configurationAttributes.launch`**: `program` (defaults to `${file}`),
  `compilerPath` (defaults to `${config:qb64pe.compilerPath}`), `stopOnEntry`,
  `port` (default from setting).
- **Settings** (`qb64pe.*`): `debug.basePort` (default **9000**, matching the IDE's
  `BaseTCPPort`), `debug.autoAddDebug` (inject `$DEBUG` if missing), `debug.timeoutMs`.
- **Keybindings**: F5 start / Shift+F5 stop / F9 toggle breakpoint / F10 step over /
  F11 step in / Shift+F11 step out are VS Code defaults once the adapter is registered
  and `breakpoints` is contributed — no custom bindings needed for the basics.

---

## 6. Protocol appendix (authoritative — from the shipped `vwatch.bm`)

The single most important section. Verified against
`internal/support/vwatch/vwatch.{bi,bm}` in QB64PE v4.7.0.

**Transport.** TCP. The debuggee is the **client**
(`_OPENCLIENT("QB64IDE:" + QB64DEBUGPORT + ":localhost")`); our adapter is the
**host/server**, listening on `127.0.0.1:<port>`. Default base port **9000**
(IDE setting `BaseTCPPort`).

**Framing.** Every message is `MKL$(len) + payload`, where `MKL$(len)` is a 4-byte
little-endian signed `LONG` and `len` is the payload byte length. Read: buffer bytes;
if ≥ 4, `size = CVL(first 4 bytes)`; once buffered ≥ `4 + size`, take the next `size`
bytes as one payload; repeat. (No STX/US/EOT — that was the old format Durus targeted.)

**Payload.** `command:value`, split on the **first** `:`. `command` is ASCII; `value`
may be ASCII **or binary-packed** (`MKL$`/`MKI$`/`_MK$` sequences) depending on the
command.

**Handshake (on connect).** Debuggee → host:
- `me:<COMMAND$(0)>` — the debuggee's own command line (used to confirm identity).
- `hwnd:<_MK$(_OFFSET, _WINDOWHANDLE)>` — window handle (packed offset).

Host → debuggee (setup, then start): `line count:<n>`, `breakpoint count:<n>`,
`breakpoint list:<packed line indexes>`, `skip count:<n>`, `skip list:<…>`, then `run`.

**Debuggee → host messages** (`VWatchIn`):

| Command | Value | Meaning |
|---|---|---|
| `me:` | command line | identity (handshake) |
| `hwnd:` | packed handle | window handle |
| `line number:` | — | stopped at a normal line (current line follows via state) |
| `breakpoint:` | — | stopped because the current line is a breakpoint |
| `current sub:` | sub name | the current SUB/FUNCTION name |
| `call stack size:` | `MKL$(n)` | number of stack frames to follow |
| `call stack:` | `CHR$(0)`-separated frames | each frame `subname,<line info>` |
| `address read:` | `MKL$(tempIndex)+MKL$(arrayIndex)+MKL$(element)+MKL$(storage)+bytes` | a variable's value (typed bytes) |
| `watchpoint:` | `MKL$(index)+MKL$(len)+indexes+MKL$(off)+MKI$(len)+expr` | a watchpoint hit |
| `error:` | `MKL$(line)` | runtime error at line |
| `enter input:` / `leave input` | `MKL$(line)` / — | program is waiting for `INPUT` |
| `quit:` | reason text | program ended / error / disconnect |

**Host → debuggee commands** (`VWatchOut`, from the `CASE` dispatch in `vwatch.bm`):
`vwatch`, `line count`, `breakpoint count`, `breakpoint list`, `hwnd`, `skip count`,
`skip list`, `run`, `break`, `set breakpoint`, `clear breakpoint`, `set skip line`,
`clear skip line`, `clear all breakpoints`, `clear all skips`, `run to line`, `step`,
`step over`, `step out`, `free`, `call stack`, `get global var`, `get local var`,
`set global address`, `set local address`, `clear last watchpoint`,
`set global watchpoint` / `set local watchpoint` / `clear global watchpoint` /
`clear local watchpoint`, `current sub`, `set next line`.

**Variable value decoding** (`storage` code → QB64 type, then `_CV`/`CV*`):
`_BYTE`, `_UNSIGNED _BYTE`, `INTEGER`, `_UNSIGNED INTEGER`, `LONG`, `_UNSIGNED LONG`,
`_INTEGER64`, `_UNSIGNED _INTEGER64`, `SINGLE` (`CVS`), `DOUBLE` (`CVD`), `_FLOAT`,
`_OFFSET`, `_UNSIGNED _OFFSET`, and strings. The M3 codec re-implements these
conversions in TypeScript from the raw bytes.

> Items to confirm empirically during M2/M3 by capturing real bytes (see §8): the
> exact `call stack:` frame delimiter and per-frame line format, and the precise
> field order/packing of `address read:` and `watchpoint:`. The table above reflects
> the send sites in `vwatch.bm`; a captured trace pins the details.

---

## 7. Interaction with the existing F5 launcher

0.11.1 registered a build-&-run adapter for type `QB64PE` (compile + run in a
terminal, no debugging). The real debugger reuses the same type. Plan:
- Keep "Run without debugging" → the terminal launcher (fast, no `$DEBUG` needed).
- "Start debugging" → the vwatch adapter (requires `$DEBUG`; offer to auto-add it).
- Share the compile step and the `qb64pe.compilerPath` setting; don't duplicate.

---

## 8. Testing strategy

- **Unit (CI-able, no QB64PE):** the `vwatchProtocol` codec — framing round-trips,
  partial/split reads, multiple messages per packet, every message parse, variable
  byte decode for each type. This is where correctness is nailed down.
- **Mock debuggee:** a small Node TCP client that replays a **captured trace** of a
  real `$DEBUG` session (record once from the QB64PE IDE talking to a program, or from
  our adapter with verbose logging). Lets us test the DAP session end-to-end against
  realistic byte sequences in the extension-host integration suite, without a GUI.
- **Manual E2E (maintainer):** the final "set a breakpoint, F5, it stops; step; read a
  variable" pass needs QB64PE compiling and running a real GUI `$DEBUG` program — not
  drivable headlessly. Budget a round of this per milestone, especially M3.

---

## 9. Risks & open questions

- **Variable inspection (M3) is the hardest part** — the `address read:` binary
  packing and typed decode, plus arrays and TYPE members. Highest chance of needing
  iteration against real traces.
- **Line-number mapping with `$INCLUDE`** — vwatch numbers lines across the compiled
  unit; mapping back to the right file+line is M4 and leans entirely on the index.
- **Timing/handshake** — do it event-driven off framed messages (no `sleep`s). The old
  attempt's `await sleep()` after each write is a smell we explicitly avoid.
- **Protocol drift across QB64PE versions** — pin behavior to the shipped `vwatch.bm`;
  guard the handshake and log unknown commands rather than crashing. Consider a
  detected-version note in the debug console.
- **`_WINDOWHANDLE`/console vs graphics programs** — behavior may differ for
  `$CONSOLE:ONLY` vs graphics windows; test both.
- **Windows vs Linux/macOS** — exe extension, path handling, and how the debuggee
  window is surfaced differ; the codec is portable but launch/spawn needs per-OS care.

---

## 10. Deliverables checklist

- [ ] `src/core/vwatchProtocol.ts` + `src/test/core/vwatchProtocol.test.ts` (M1)
- [ ] `src/providers/QB64DebugSession.ts` (M1→M3)
- [ ] `src/providers/QB64DebugAdapterFactory.ts` + `extension.ts` registration (M1)
- [ ] `package.json`: `debuggers`, `breakpoints`, launch attributes, `qb64pe.debug.*` settings (M1)
- [ ] Captured-trace mock + integration test (M2)
- [ ] Variable decode + scopes/variables/evaluate (M3)
- [ ] `$INCLUDE` line mapping via the index (M4)
- [ ] README + changelog; version bump

## Credit

Builds on the debugger groundwork by **LordDurus** (`QB64Official/vscode@Debugger`),
used as a reference for the DAP↔vwatch command mapping and launch flow. The protocol
spec here is taken from QB64PE's shipped `vwatch` runtime.
