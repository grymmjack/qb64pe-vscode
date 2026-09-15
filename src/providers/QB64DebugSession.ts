"use strict";
import * as vscode from "vscode";
import * as net from "net";
import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  LoggingDebugSession,
  InitializedEvent,
  StoppedEvent,
  TerminatedEvent,
  OutputEvent,
  Thread,
  StackFrame,
  Source,
  Scope,
  Handles,
} from "@vscode/debugadapter";
import { DebugProtocol } from "@vscode/debugprotocol";
import {
  SymbolIndex,
  normalizeBase,
  normalizePath,
  createIncludeResolver,
} from "../core/index";
import {
  flatten,
  buildReverseMap,
  LineOrigin,
} from "../core/flatten";
import { parseContent } from "../core/parser";
import { QB64Symbol } from "../core/symbols";
import {
  FrameReader,
  encode,
  mkl,
  mki,
  packLineList,
  interpret,
  decodeValue,
  VWatchIn,
  VWatchOut,
  CallStackFrame,
} from "../core/vwatchProtocol";
import { ResolvedVar, resolveGlobals, resolveLocals } from "../core/vwatchVars";
import {
  compareValues,
  hitConditionMet,
  parseCondition,
} from "../core/vwatchConditions";

const THREAD_ID = 1;
const THREAD_NAME = "QB64PE program";

/** A held variablesResponse collecting async get-var replies. */
interface VarBatch {
  response: DebugProtocol.VariablesResponse;
  remaining: number;
  vars: DebugProtocol.Variable[];
  settled: boolean;
}

/** What a DAP variablesReference points at. */
type RefTarget =
  | { kind: "locals" }
  | { kind: "globals" }
  | { kind: "constants" }
  | {
      kind: "udt";
      typeName: string;
      localIndex: number;
      isLocal: boolean;
      scope: string;
      baseOffset: number;
    };

interface UdtField {
  name: string;
  sendType: string;
  size: number | null; // null when the field's size is unknown (breaks offsets)
  offset: number; // NaN once an unknown field precedes it
  isArray: boolean;
  isUDT: boolean;
  udtType?: string;
}

interface UdtLayout {
  fields: UdtField[];
  size: number; // NaN if any member size is unknown
}

/** A breakpoint with optional condition / hit-count. */
interface BpInfo {
  line: number;
  condition?: string;
  hitCondition?: string;
  hits: number;
}

/** QB64 scalar type -> {send name, byte size}. Packed, no alignment. */
const SCALAR_SIZES: Record<string, { sendType: string; size: number }> = {
  "_BYTE": { sendType: "_BYTE", size: 1 },
  "_UNSIGNED _BYTE": { sendType: "_UNSIGNED _BYTE", size: 1 },
  "INTEGER": { sendType: "INTEGER", size: 2 },
  "_UNSIGNED INTEGER": { sendType: "_UNSIGNED INTEGER", size: 2 },
  "LONG": { sendType: "LONG", size: 4 },
  "_UNSIGNED LONG": { sendType: "_UNSIGNED LONG", size: 4 },
  "_INTEGER64": { sendType: "_INTEGER64", size: 8 },
  "_UNSIGNED _INTEGER64": { sendType: "_UNSIGNED _INTEGER64", size: 8 },
  "SINGLE": { sendType: "SINGLE", size: 4 },
  "DOUBLE": { sendType: "DOUBLE", size: 8 },
  "_FLOAT": { sendType: "_FLOAT", size: 32 },
  "_OFFSET": { sendType: "_OFFSET", size: 8 },
  "_UNSIGNED _OFFSET": { sendType: "_UNSIGNED _OFFSET", size: 8 },
};

interface QB64LaunchArguments
  extends DebugProtocol.LaunchRequestArguments {
  /** Path to the `.bas` to compile and debug. */
  program: string;
  /** Path to the QB64PE compiler executable. */
  compilerPath?: string;
  /** TCP base port to host on (the debuggee connects back to it). */
  port?: number;
  /** Stop on the program's first executable line. */
  stopOnEntry?: boolean;
  /** Append `$DEBUG` to a temp copy if the source lacks it. */
  autoAddDebug?: boolean;
  /** Milliseconds to wait for the debuggee to connect back. */
  timeoutMs?: number;
}

/**
 * A DAP debug session that bridges VS Code to QB64PE's `vwatch` debugger.
 *
 * We are the vwatch *host*: we listen on a TCP port, compile the program with
 * `$DEBUG`, spawn it with `QB64DEBUGPORT` set, and translate the length-framed
 * vwatch protocol (see {@link ../core/vwatchProtocol}) to/from DAP. The
 * {@link SymbolIndex} maps vwatch's line/sub information back to real source
 * locations.
 *
 * M1 scope: connect, breakpoints, stop-on-line, continue, pause, terminate.
 * Stepping and the full call stack (M2) and variables (M3) build on this.
 */
export class QB64DebugSession extends LoggingDebugSession {
  private server?: net.Server;
  private socket?: net.Socket;
  private child?: cp.ChildProcess;
  private readonly reader = new FrameReader();

  private args!: QB64LaunchArguments;
  private program = "";
  private compiledProgram = ""; // the file actually compiled (may be a temp copy)
  private tempProgram?: string; // temp copy to clean up, if any
  private lineCount = 1;

  /** The compiler's generated C variable table (for live variable values). */
  private generatedC = "";
  private globals: ResolvedVar[] = [];
  private compilerPath = "";

  /** Flattened-line → original (file, line), and the reverse map. */
  private origins: LineOrigin[] = [];
  private flatByFile = new Map<string, Map<number, number>>();
  private flatText = ""; // the flattened source we compiled (for type parsing)
  /** The source file of the current stop (may be an $INCLUDEd file). */
  private currentFile = "";

  /** Breakpoints requested by VS Code, keyed by file path. */
  private readonly breakpoints = new Map<string, BpInfo[]>();
  /** Whether the handshake/`run` has been sent. */
  private launched = false;
  private stopOnEntry = false;
  private timeoutTimer?: ReturnType<typeof setTimeout>;

  /** Current stop state, for building the stack trace. */
  private currentLine = 0;
  private currentSub = "";
  private callStack: CallStackFrame[] = [];
  private callStackReady = false;
  /**
   * stackTrace responses held until the call stack arrives. VS Code can issue
   * several stackTrace requests before we have the frames (notably on a
   * step-into), and every one must be answered or it tears down the session —
   * so this is a queue, not a single slot.
   */
  private pendingStackTraces: DebugProtocol.StackTraceResponse[] = [];

  constructor(private readonly index: SymbolIndex) {
    super("qb64pe-debug.txt");
    this.setDebuggerLinesStartAt1(true);
    this.setDebuggerColumnsStartAt1(true);
  }

  // ---- DAP lifecycle -------------------------------------------------------

  /** Log every incoming DAP request so we can see the VS Code ↔ adapter flow. */
  protected dispatchRequest(request: DebugProtocol.Request): void {
    if (this.isTracing()) this.output(`  [dap] ${request.command}\n`);
    super.dispatchRequest(request);
  }

  protected initializeRequest(
    response: DebugProtocol.InitializeResponse,
    _args: DebugProtocol.InitializeRequestArguments
  ): void {
    response.body = response.body || {};
    response.body.supportsConfigurationDoneRequest = true;
    response.body.supportsTerminateRequest = true;
    response.body.supportsGotoTargetsRequest = true; // "set next line" (jump to cursor)
    response.body.supportsEvaluateForHovers = true; // hover a variable to see its value
    response.body.supportsConditionalBreakpoints = true; // break if <expr>
    response.body.supportsHitConditionalBreakpoints = true; // break on Nth hit
    // M5 capability (set variable) is added when that write path lands.
    this.sendResponse(response);
    this.sendEvent(new InitializedEvent());
  }

  protected async launchRequest(
    response: DebugProtocol.LaunchResponse,
    args: QB64LaunchArguments
  ): Promise<void> {
    // Fill launch-arg gaps from the qb64pe.debug.* settings.
    const cfg = vscode.workspace.getConfiguration("qb64pe");
    if (args.port === undefined) args.port = cfg.get<number>("debug.basePort", 9000);
    if (args.autoAddDebug === undefined)
      args.autoAddDebug = cfg.get<boolean>("debug.autoAddDebug", true);
    if (args.timeoutMs === undefined)
      args.timeoutMs = cfg.get<number>("debug.timeoutMs", 15000);

    this.args = args;
    this.stopOnEntry = !!args.stopOnEntry;
    this.program = args.program;

    if (!this.program || !fs.existsSync(this.program)) {
      this.fail(response, `Program not found: ${this.program}`);
      return;
    }

    const compilerPath = this.resolveCompilerPath(args);
    this.compilerPath = compilerPath;
    if (!compilerPath) {
      this.fail(
        response,
        "No QB64PE compiler configured. Set qb64pe.compilerPath or the launch config's compilerPath."
      );
      return;
    }

    // Flatten every $INCLUDE inline so the whole program compiles as one main
    // module — the only way QB64PE instruments (and thus debugs) code that lives
    // in .bi/.bm files. A line map translates flattened lines back to the real
    // files. $DEBUG is appended (a global toggle) if the program lacks it.
    try {
      this.prepareCompiledProgram(args);
    } catch (e) {
      this.fail(response, `Could not prepare source: ${e}`);
      return;
    }

    this.lineCount = this.origins.length + 2;

    // Host first, so the debuggee can connect the instant it starts.
    let port: number;
    try {
      port = await this.startServer(args.port ?? 9000);
    } catch (e) {
      this.fail(response, `Could not open a debug port: ${e}`);
      return;
    }

    const exePath = this.exePathFor(this.compiledProgram);
    const compileStart = Date.now();
    const ok = await this.compile(compilerPath, this.compiledProgram, exePath);
    if (!ok) {
      this.fail(response, "Compilation failed — see the debug console.");
      return;
    }
    this.loadVariableManifest(compilerPath, compileStart);
    const producedExe = this.findProducedExe(exePath);
    if (!producedExe) {
      this.fail(
        response,
        `Compiler reported success but no executable was found near ${exePath}.`
      );
      return;
    }

    // Arm a connection timeout so a program without $DEBUG (or that refuses to
    // connect) does not hang the session forever.
    const timeoutMs = args.timeoutMs ?? 15000;
    this.timeoutTimer = setTimeout(() => {
      if (!this.launched) {
        this.output(
          `Debuggee did not connect within ${timeoutMs}ms. Does the program contain $DEBUG?\n`,
          "stderr"
        );
        this.terminate("connect timeout");
      }
    }, timeoutMs);

    this.spawnDebuggee(producedExe, port);
    this.sendResponse(response);
  }

  protected setBreakPointsRequest(
    response: DebugProtocol.SetBreakpointsResponse,
    args: DebugProtocol.SetBreakpointsArguments
  ): void {
    const file = args.source.path ?? "";
    const requested = args.breakpoints ?? [];
    const key = normalizePath(file);

    // A breakpoint binds if its line maps into the flattened program (which now
    // includes every $INCLUDEd file). Lines with no mapping (blank, or a file
    // not part of this program) are reported unverified.
    this.breakpoints.set(
      key,
      requested
        .filter((b) => this.toFlat(file, b.line) !== undefined)
        .map((b) => ({
          line: b.line,
          condition: b.condition,
          hitCondition: b.hitCondition,
          hits: 0,
        }))
    );
    if (this.launched && this.socket) {
      this.send(VWatchOut.ClearAllBreakpoints);
      for (const line of this.allBreakpointLines()) {
        this.send(VWatchOut.SetBreakpoint, mkl(line));
      }
    }

    response.body = {
      breakpoints: requested.map((b) => {
        const flat = this.toFlat(file, b.line);
        return flat !== undefined
          ? { verified: true, line: b.line }
          : {
              verified: false,
              line: b.line,
              message: "This line is not part of the compiled program.",
            };
      }),
    };
    this.sendResponse(response);
  }

  protected configurationDoneRequest(
    response: DebugProtocol.ConfigurationDoneResponse,
    _args: DebugProtocol.ConfigurationDoneArguments
  ): void {
    this.sendResponse(response);
  }

  protected threadsRequest(
    response: DebugProtocol.ThreadsResponse
  ): void {
    response.body = { threads: [new Thread(THREAD_ID, THREAD_NAME)] };
    this.sendResponse(response);
  }

  protected stackTraceRequest(
    response: DebugProtocol.StackTraceResponse,
    _args: DebugProtocol.StackTraceArguments
  ): void {
    // The call stack is requested on each stop; hold the response until it
    // arrives so the panel shows every frame, not just the current one.
    if (this.callStackReady) {
      this.respondStackTrace(response);
    } else {
      this.pendingStackTraces.push(response);
    }
  }

  private flushPendingStackTrace(): void {
    const pending = this.pendingStackTraces;
    this.pendingStackTraces = [];
    for (const response of pending) this.respondStackTrace(response);
  }

  private respondStackTrace(response: DebugProtocol.StackTraceResponse): void {
    const frames = this.buildFrames();
    response.body = { stackFrames: frames, totalFrames: frames.length };
    this.sendResponse(response);
  }

  /**
   * Build DAP frames from the vwatch call stack. vwatch sends frames as verbatim
   * `subname, line NNN` strings ordered outermost→innermost (the current sub
   * last); we reverse them so frame 0 is the live position and override its line
   * with the actual stop line. When the stack is empty we are in the main
   * module, so a single live frame is shown.
   */
  private buildFrames(): StackFrame[] {
    if (this.callStack.length === 0) {
      return [
        new StackFrame(
          0,
          this.currentSub || "(main)",
          this.sourceFor(this.currentFile || this.program),
          this.currentLine
        ),
      ];
    }
    const innermostFirst = [...this.callStack].reverse();
    return innermostFirst.map((frame, i) => {
      // Frame 0 is the live position; deeper frames report a flattened line,
      // which the line map turns back into the real (file, line).
      if (i === 0) {
        return new StackFrame(
          0,
          frame.sub || this.currentSub || "(main)",
          this.sourceFor(this.currentFile || this.program),
          this.currentLine
        );
      }
      const origin = frame.line ? this.fromFlat(frame.line) : undefined;
      const file = origin?.file ?? this.program;
      const line = origin?.line ?? frame.line ?? 0;
      return new StackFrame(i, frame.sub || "(main)", this.sourceFor(file), line);
    });
  }

  // ---- variable manifest (M3) ----------------------------------------------

  /**
   * Read the compiler's generated C from `<compilerDir>/internal/temp` and pull
   * out the vwatch variable table. Only files written by this compile are read
   * (by mtime) so a previous program's tables are ignored.
   */
  private loadVariableManifest(compilerPath: string, sinceMs: number): void {
    try {
      const tempDir = path.join(path.dirname(compilerPath), "internal", "temp");
      if (!fs.existsSync(tempDir)) return;
      const parts: string[] = [];
      for (const name of fs.readdirSync(tempDir)) {
        if (!name.toLowerCase().endsWith(".txt")) continue;
        const full = path.join(tempDir, name);
        try {
          const st = fs.statSync(full);
          if (st.mtimeMs + 2000 < sinceMs) continue; // stale (older than this compile)
          parts.push(fs.readFileSync(full, "latin1"));
        } catch {
          /* skip unreadable file */
        }
      }
      this.generatedC = parts.join("\n");
      this.globals = resolveGlobals(this.generatedC);
      if (this.isTracing()) {
        this.output(
          `Loaded variable manifest: ${this.globals.length} global(s).\n`
        );
      }
    } catch (e) {
      this.output(`Could not read variable manifest: ${e}\n`, "stderr");
    }
  }

  // ---- variables (M3) ------------------------------------------------------
  //
  // Live values: the compiler's generated C gives us each variable's slot in
  // vwatch_global_vars[] / vwatch_local_vars[] (see core/vwatchVars). For each
  // in-scope variable we issue a get-var request and decode the `address read:`
  // reply. Requests are async, so a variablesResponse is held until its replies
  // arrive (or a short timeout). Arrays and UDTs are listed but not yet read.

  private readonly refs = new Handles<RefTarget>();
  private varSeq = 0;
  /** tempIndex -> the pending get-var it belongs to. */
  private readonly varPending = new Map<
    number,
    { batch: VarBatch; name: string; varType: string; ref?: number }
  >();
  private readonly evalPending = new Map<
    number,
    { response: DebugProtocol.EvaluateResponse; varType: string; name?: string }
  >();
  /** UPPER type name -> TYPE symbol (built lazily from the index). */
  private typeByName?: Map<string, QB64Symbol>;
  private readonly udtLayoutCache = new Map<string, UdtLayout | null>();

  protected scopesRequest(
    response: DebugProtocol.ScopesResponse,
    _args: DebugProtocol.ScopesArguments
  ): void {
    response.body = {
      scopes: [
        new Scope("Locals", this.refs.create({ kind: "locals" }), false),
        new Scope("Module & Globals", this.refs.create({ kind: "globals" }), false),
        new Scope("Constants", this.refs.create({ kind: "constants" }), false),
      ],
    };
    this.sendResponse(response);
  }

  protected variablesRequest(
    response: DebugProtocol.VariablesResponse,
    args: DebugProtocol.VariablesArguments
  ): void {
    const target = this.refs.get(args.variablesReference);

    if (!target || target.kind === "constants") {
      response.body = { variables: this.constantVariables() };
      this.sendResponse(response);
      return;
    }

    if (target.kind === "udt") {
      this.expandUdt(response, target);
      return;
    }

    // A scope: list its variables (scalars read live, UDTs expandable).
    const isLocal = target.kind === "locals";
    const vars = isLocal ? this.currentLocalVars() : this.globals;
    const scope = isLocal ? this.currentSub : "";

    const immediate: DebugProtocol.Variable[] = [];
    const batch: VarBatch = { response, remaining: 0, vars: immediate, settled: false };

    for (const v of vars) {
      if (v.isUDT && !v.isArray) {
        const typeName = this.udtTypeOf(v.name);
        const ref = typeName
          ? this.refs.create({
              kind: "udt",
              typeName,
              localIndex: v.index,
              isLocal,
              scope,
              baseOffset: 0,
            })
          : 0;
        immediate.push({
          name: v.name,
          value: typeName ? `{${typeName}}` : "<UDT>",
          variablesReference: ref,
        });
      } else if (v.isArray) {
        immediate.push({
          name: v.name + "()",
          value: `<array of ${v.isUDT ? "TYPE" : v.varType}> — Watch ${v.name}(index)`,
          variablesReference: 0,
        });
      } else {
        this.requestScalar(batch, isLocal, scope, v.index, 0, 0, v.varType, v.size, v.name);
      }
    }

    if (batch.remaining === 0) {
      this.settleVarBatch(batch);
    } else {
      setTimeout(() => this.settleVarBatch(batch), 700);
    }
  }

  /** Expand a UDT variable/field into its members. */
  private expandUdt(
    response: DebugProtocol.VariablesResponse,
    target: Extract<RefTarget, { kind: "udt" }>
  ): void {
    const layout = this.udtLayout(target.typeName);
    const immediate: DebugProtocol.Variable[] = [];
    const batch: VarBatch = { response, remaining: 0, vars: immediate, settled: false };

    for (const f of layout?.fields ?? []) {
      const offset = target.baseOffset + f.offset;
      if (f.isArray || f.size === null || Number.isNaN(offset)) {
        immediate.push({
          name: f.name,
          value: f.isArray ? "<array>" : "<?>",
          variablesReference: 0,
        });
      } else if (f.isUDT && f.udtType) {
        const ref = this.refs.create({
          kind: "udt",
          typeName: f.udtType,
          localIndex: target.localIndex,
          isLocal: target.isLocal,
          scope: target.scope,
          baseOffset: offset,
        });
        immediate.push({ name: f.name, value: `{${f.udtType}}`, variablesReference: ref });
      } else {
        this.requestScalar(
          batch,
          target.isLocal,
          target.scope,
          target.localIndex,
          1, // element > 0 marks a UDT member
          offset,
          f.sendType,
          f.size,
          f.name
        );
      }
    }

    if (batch.remaining === 0) {
      this.settleVarBatch(batch);
    } else {
      setTimeout(() => this.settleVarBatch(batch), 700);
    }
  }

  /** Queue a get-var for one scalar/field value into a batch. */
  private requestScalar(
    batch: VarBatch,
    isLocal: boolean,
    scope: string,
    localIndex: number,
    element: number,
    elementOffset: number,
    varType: string,
    varSize: number,
    name: string
  ): void {
    if (!this.socket) {
      batch.vars.push({ name, value: "<no session>", variablesReference: 0 });
      return;
    }
    const tempIndex = ++this.varSeq;
    batch.remaining += 1;
    this.varPending.set(tempIndex, { batch, name, varType });
    this.issueGetVar({
      isLocal,
      scope,
      localIndex,
      element,
      elementOffset,
      varType,
      varSize,
      tempIndex,
    });
  }

  /** CONST symbols with their static values (always correct, no protocol). */
  private constantVariables(): DebugProtocol.Variable[] {
    const seen = new Set<string>();
    const consts = this.programSyms().filter((s) => {
      if (s.type !== "CONST") return false;
      const k = s.name.toUpperCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return consts.map((s) => ({
      name: s.name,
      value: s.value ?? "<const>",
      variablesReference: 0,
      presentationHint: { kind: "data", attributes: ["constant", "readOnly"] },
    }));
  }

  /** Locals of the current routine, from the compiler manifest. */
  private currentLocalVars(): ResolvedVar[] {
    if (!this.currentSub) return [];
    return resolveLocals(this.generatedC, this.currentSub);
  }

  /**
   * Build and send a get-var request. Field order mirrors the QB64PE IDE
   * (`ide_methods.bas`): tempIndex, isArray, dimLine, localIndex, array-indexes
   * (length-prefixed), arrayElementSize, element, elementOffset, varSize,
   * storage, scope, varType.
   */
  private issueGetVar(o: {
    isLocal: boolean;
    scope: string;
    localIndex: number;
    isArray?: boolean;
    arrayIndexes?: number[];
    element?: number;
    elementOffset?: number;
    varType: string;
    varSize: number;
    tempIndex: number;
  }): void {
    const idxBuf =
      o.arrayIndexes && o.arrayIndexes.length
        ? Buffer.concat(o.arrayIndexes.map((n) => mkl(n)))
        : Buffer.alloc(0);
    const scopeBuf = Buffer.from(o.scope, "latin1");
    const typeBuf = Buffer.from(o.varType, "latin1");
    const payload = Buffer.concat([
      mkl(o.tempIndex),
      Buffer.from([o.isArray ? 1 : 0]),
      mkl(0), // originalVarLineNumber (skip the pre-DIM guard)
      mkl(o.localIndex),
      mkl(idxBuf.length),
      idxBuf,
      mkl(0), // arrayElementSize (0 → stride = varSize, fine for scalar elements)
      mkl(o.element ?? 0),
      mkl(o.elementOffset ?? 0),
      mkl(o.varSize),
      mkl(o.tempIndex), // storage (echoed back; reuse the tag)
      mki(scopeBuf.length),
      scopeBuf,
      mki(typeBuf.length),
      typeBuf,
    ]);
    this.send(o.isLocal ? VWatchOut.GetLocalVar : VWatchOut.GetGlobalVar, payload);
  }

  private onAddressRead(read: { tempIndex: number; bytes: Buffer }): void {
    const cond = this.condPending.get(read.tempIndex);
    if (cond) {
      this.condPending.delete(read.tempIndex);
      const value = this.formatValue(cond.varType, read.bytes);
      if (compareValues(value, cond.op, cond.rhs)) {
        this.reportStop(cond.line, "breakpoint");
      } else {
        this.send(VWatchOut.Run); // condition false → keep running
      }
      return;
    }
    const info = this.varPending.get(read.tempIndex);
    if (info) {
      this.varPending.delete(read.tempIndex);
      info.batch.vars.push({
        name: info.name,
        value: this.formatValue(info.varType, read.bytes, info.name),
        variablesReference: info.ref ?? 0,
      });
      info.batch.remaining -= 1;
      if (info.batch.remaining <= 0) this.settleVarBatch(info.batch);
      return;
    }
    const ev = this.evalPending.get(read.tempIndex);
    if (ev) {
      this.evalPending.delete(read.tempIndex);
      ev.response.body = {
        result: this.formatValue(ev.varType, read.bytes, ev.name),
        variablesReference: 0,
      };
      this.sendResponse(ev.response);
    }
  }

  private formatValue(varType: string, bytes: Buffer, name?: string): string {
    const decoded = decodeValue(varType, bytes);
    if (!decoded) return "<unreadable>";
    let text = decoded.text + (decoded.approximate ? " (approx)" : "");
    const color = name ? this.colorHint(name, varType, decoded.text) : "";
    return text + color;
  }

  /**
   * If a variable looks like a QB64 `_RGB32` colour (name contains color/fg/bg
   * and the value is a 32-bit integer packed as &HAARRGGBB), append a readable
   * `#RRGGBB A:nn` hint. The Variables panel can't show a real swatch.
   */
  private colorHint(name: string, varType: string, valueText: string): string {
    if (varType.toUpperCase().includes("STRING")) return "";
    if (!/colou?r|(^|_)fg($|_)|(^|_)bg($|_)|(^|_)clr/i.test(name)) return "";
    const n = Number(valueText);
    if (!Number.isInteger(n)) return "";
    const v = n >>> 0; // treat as unsigned 32-bit
    const a = (v >>> 24) & 0xff;
    const r = (v >>> 16) & 0xff;
    const g = (v >>> 8) & 0xff;
    const b = v & 0xff;
    const hex = (x: number) => x.toString(16).padStart(2, "0").toUpperCase();
    return `  (#${hex(r)}${hex(g)}${hex(b)} A:${a})`;
  }

  private settleVarBatch(batch: VarBatch): void {
    if (batch.settled) return;
    batch.settled = true;
    batch.vars.sort((a, b) => a.name.localeCompare(b.name));
    batch.response.body = { variables: batch.vars };
    this.sendResponse(batch.response);
  }

  // ---- type layout ---------------------------------------------------------

  /** Symbols parsed directly from the program being debugged. */
  private parsedProgram?: QB64Symbol[];
  private programSyms(): QB64Symbol[] {
    if (!this.parsedProgram) {
      try {
        // Parse the flattened source so TYPEs/vars from $INCLUDEs are included.
        this.parsedProgram = parseContent(
          this.flatText || fs.readFileSync(this.program, "latin1"),
          this.program
        );
      } catch {
        this.parsedProgram = [];
      }
    }
    return this.parsedProgram;
  }

  /**
   * The TYPE name of a variable. Resolved from a direct parse of the program
   * (authoritative for the file being debugged) and the workspace index (covers
   * `$INCLUDE`d declarations when they are indexed).
   */
  private udtTypeOf(name: string): string | undefined {
    const local = this.programSyms().find(
      (s) => s.type === "VARIABLE" && s.name.toUpperCase() === name && s.dataType
    );
    const dt =
      local?.dataType ??
      this.index
        .lookupBase(name)
        .find((s) => s.type === "VARIABLE" && s.dataType)?.dataType;
    return dt && this.types().has(dt.toUpperCase()) ? dt : undefined;
  }

  private types(): Map<string, QB64Symbol> {
    if (!this.typeByName) {
      this.typeByName = new Map();
      for (const s of this.index.allSymbols()) {
        if (s.type === "TYPE") this.typeByName.set(s.name.toUpperCase(), s);
      }
      for (const s of this.programSyms()) {
        if (s.type === "TYPE") this.typeByName.set(s.name.toUpperCase(), s);
      }
    }
    return this.typeByName;
  }

  /** Packed field layout of a TYPE (byte offsets), or null if unknown. */
  private udtLayout(typeName: string): UdtLayout | null {
    const key = typeName.toUpperCase();
    const cached = this.udtLayoutCache.get(key);
    if (cached !== undefined) return cached;
    const sym = this.types().get(key);
    if (!sym) {
      this.udtLayoutCache.set(key, null);
      return null;
    }
    const fields: UdtField[] = [];
    let offset = 0;
    for (const m of sym.members ?? []) {
      const info = m.isArray ? null : this.memberInfo(m.dataType);
      const size = info ? info.size : null;
      fields.push({
        name: m.name,
        sendType: info?.sendType ?? "",
        size,
        offset,
        isArray: !!m.isArray,
        isUDT: !!info?.isUDT,
        udtType: info?.udtType,
      });
      offset = size === null ? NaN : offset + size;
    }
    const layout: UdtLayout = { fields, size: offset };
    this.udtLayoutCache.set(key, layout);
    return layout;
  }

  /** How to request a TYPE member of the given declared type. */
  private memberInfo(
    dataType: string | undefined
  ): { sendType: string; size: number; isUDT?: boolean; udtType?: string } | null {
    if (!dataType) return null;
    const t = dataType.trim();
    const fixed = /^STRING\s*\*\s*(\d+)$/i.exec(t);
    if (fixed) return { sendType: `STRING * ${fixed[1]}`, size: parseInt(fixed[1], 10) };
    const scalar = SCALAR_SIZES[t.toUpperCase()];
    if (scalar) return { sendType: scalar.sendType, size: scalar.size };
    const nested = this.udtLayout(t);
    if (nested && !Number.isNaN(nested.size)) {
      return { sendType: "UDT", size: nested.size, isUDT: true, udtType: t };
    }
    return null; // variable-length STRING in a UDT, or unknown
  }

  // ---- evaluate (Watch / hover) --------------------------------------------

  protected evaluateRequest(
    response: DebugProtocol.EvaluateResponse,
    args: DebugProtocol.EvaluateArguments
  ): void {
    const expr = (args.expression || "").trim();

    // Array element:  name(i)  or  name(i, j)
    const arr = /^([A-Za-z_][A-Za-z0-9_]*)[%&!#$~]?\s*\(([^)]*)\)$/.exec(expr);
    if (arr) {
      this.evaluateArray(response, arr[1], arr[2]);
      return;
    }

    // Member path:  name.field.field
    if (expr.includes(".")) {
      this.evaluateMember(response, expr);
      return;
    }

    const upper = expr.replace(/[%&!#$~]+$/, "").toUpperCase();
    // Constants resolve statically.
    const constHit = this.index
      .lookupBase(normalizeBase(expr))
      .find((s) => s.type === "CONST");
    if (constHit?.value !== undefined) {
      this.reply(response, constHit.value);
      return;
    }

    const found = this.findVar(upper);
    if (found && !found.v.isArray && !found.v.isUDT) {
      this.evalGetVar(response, found.isLocal, {
        localIndex: found.v.index,
        varType: found.v.varType,
        varSize: found.v.size,
        name: found.v.name,
      });
      return;
    }
    this.reply(
      response,
      found?.v.isArray ? "<use name(index)>" : found?.v.isUDT ? "<use name.field>" : "<not in scope>"
    );
  }

  private evaluateArray(
    response: DebugProtocol.EvaluateResponse,
    name: string,
    indexText: string
  ): void {
    const found = this.findVar(name.toUpperCase());
    const indexes = indexText
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));
    if (!found || !found.v.isArray || found.v.isUDT || indexes.length === 0) {
      this.reply(response, "<no such array element>");
      return;
    }
    this.evalGetVar(response, found.isLocal, {
      localIndex: found.v.index,
      varType: found.v.varType,
      varSize: found.v.size,
      name: found.v.name,
      isArray: true,
      arrayIndexes: indexes,
    });
  }

  private evaluateMember(
    response: DebugProtocol.EvaluateResponse,
    expr: string
  ): void {
    const parts = expr.split(".");
    const base = this.findVar(parts[0].replace(/[%&!#$~]+$/, "").toUpperCase());
    if (!base || !base.v.isUDT) {
      this.reply(response, "<not a TYPE variable>");
      return;
    }
    let typeName = this.udtTypeOf(base.v.name);
    let offset = 0;
    let leaf: { sendType: string; size: number } | null = null;
    for (let i = 1; i < parts.length && typeName; i++) {
      const layout = this.udtLayout(typeName);
      const field = layout?.fields.find(
        (f) => f.name.toUpperCase() === parts[i].toUpperCase()
      );
      if (!field || field.size === null || Number.isNaN(offset)) {
        this.reply(response, "<no such field>");
        return;
      }
      offset += field.offset;
      if (i === parts.length - 1) {
        if (field.isUDT) {
          this.reply(response, `{${field.udtType}}`);
          return;
        }
        leaf = { sendType: field.sendType, size: field.size };
      } else {
        typeName = field.udtType;
      }
    }
    if (!leaf) {
      this.reply(response, "<no such field>");
      return;
    }
    this.evalGetVar(response, base.isLocal, {
      localIndex: base.v.index,
      varType: leaf.sendType,
      varSize: leaf.size,
      element: 1,
      elementOffset: offset,
      name: parts[parts.length - 1],
    });
  }

  /** Find a variable by (upper-case) name in locals first, then globals. */
  private findVar(upper: string): { v: ResolvedVar; isLocal: boolean } | undefined {
    const local = this.currentLocalVars().find((v) => v.name === upper);
    if (local) return { v: local, isLocal: true };
    const global = this.globals.find((v) => v.name === upper);
    if (global) return { v: global, isLocal: false };
    return undefined;
  }

  /** Issue a get-var and answer an evaluate response when it replies. */
  private evalGetVar(
    response: DebugProtocol.EvaluateResponse,
    isLocal: boolean,
    o: {
      localIndex: number;
      varType: string;
      varSize: number;
      isArray?: boolean;
      arrayIndexes?: number[];
      element?: number;
      elementOffset?: number;
      name?: string;
    }
  ): void {
    if (!this.socket) {
      this.reply(response, "<no session>");
      return;
    }
    const { name, ...req } = o;
    const tempIndex = ++this.varSeq;
    this.evalPending.set(tempIndex, { response, varType: o.varType, name });
    this.issueGetVar({
      isLocal,
      scope: isLocal ? this.currentSub : "",
      tempIndex,
      ...req,
    });
    setTimeout(() => {
      if (this.evalPending.delete(tempIndex)) {
        this.reply(response, "<no reply>");
      }
    }, 700);
  }

  private reply(response: DebugProtocol.EvaluateResponse, result: string): void {
    response.body = { result, variablesReference: 0 };
    this.sendResponse(response);
  }

  protected continueRequest(
    response: DebugProtocol.ContinueResponse,
    _args: DebugProtocol.ContinueArguments
  ): void {
    this.send(VWatchOut.Run);
    this.sendResponse(response);
  }

  protected nextRequest(
    response: DebugProtocol.NextResponse,
    _args: DebugProtocol.NextArguments
  ): void {
    this.send(VWatchOut.StepOver);
    this.sendResponse(response);
  }

  protected stepInRequest(
    response: DebugProtocol.StepInResponse,
    _args: DebugProtocol.StepInArguments
  ): void {
    this.send(VWatchOut.Step);
    this.sendResponse(response);
  }

  protected stepOutRequest(
    response: DebugProtocol.StepOutResponse,
    _args: DebugProtocol.StepOutArguments
  ): void {
    this.send(VWatchOut.StepOut);
    this.sendResponse(response);
  }

  protected gotoTargetsRequest(
    response: DebugProtocol.GotoTargetsResponse,
    args: DebugProtocol.GotoTargetsArguments
  ): void {
    // Offer the requested line as a jump target ("set next line"). The target
    // id is the flattened line vwatch expects; only offer it if it maps.
    const flat = this.toFlat(args.source.path ?? this.currentFile, args.line);
    response.body = {
      targets:
        flat !== undefined
          ? [{ id: flat, label: `Line ${args.line}`, line: args.line }]
          : [],
    };
    this.sendResponse(response);
  }

  protected gotoRequest(
    response: DebugProtocol.GotoResponse,
    args: DebugProtocol.GotoArguments
  ): void {
    this.send(VWatchOut.SetNextLine, mkl(args.targetId)); // targetId is a flat line
    this.sendResponse(response);
  }

  protected pauseRequest(
    response: DebugProtocol.PauseResponse,
    _args: DebugProtocol.PauseArguments
  ): void {
    this.send(VWatchOut.Break);
    this.sendResponse(response);
  }

  protected terminateRequest(
    response: DebugProtocol.TerminateResponse,
    _args: DebugProtocol.TerminateArguments
  ): void {
    this.terminate("terminate request");
    this.sendResponse(response);
  }

  protected disconnectRequest(
    response: DebugProtocol.DisconnectResponse,
    _args: DebugProtocol.DisconnectArguments
  ): void {
    this.terminate("disconnect request");
    this.sendResponse(response);
  }

  // ---- vwatch host ---------------------------------------------------------

  private startServer(basePort: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = net.createServer((socket) => this.onConnection(socket));
      this.server = server;
      let port = basePort;
      const tryListen = () => {
        server.once("error", (err: NodeJS.ErrnoException) => {
          if (err.code === "EADDRINUSE" && port < basePort + 50) {
            port += 1;
            setImmediate(tryListen);
          } else {
            reject(err);
          }
        });
        server.listen(port, "127.0.0.1", () => resolve(port));
      };
      tryListen();
    });
  }

  private onConnection(socket: net.Socket): void {
    if (this.socket) {
      // Only one debuggee expected; ignore extra connections.
      socket.destroy();
      return;
    }
    this.socket = socket;
    this.output("Debuggee connected.\n");
    socket.on("data", (chunk) => this.onData(chunk));
    socket.on("error", () => {
      /* handled by close */
    });
    socket.on("close", () => {
      if (this.socket === socket) this.terminate("socket close");
    });
  }

  private onData(chunk: Buffer): void {
    this.reader.push(chunk);
    let raw;
    while ((raw = this.reader.next()) !== null) {
      try {
        this.dispatch(interpret(raw));
      } catch (e) {
        this.output(`[dispatch error] ${e instanceof Error ? e.stack : e}\n`, "stderr");
      }
    }
  }

  private dispatch(msg: ReturnType<typeof interpret>): void {
    this.traceRx(msg);
    switch (msg.kind) {
      case "me":
        this.onHandshake();
        break;
      case "hwnd":
        // Window handle; not needed for M1 (used for foreground on Windows).
        break;
      case "stopped":
        this.onStop(msg.line, msg.reason === "breakpoint" ? "breakpoint" : "step");
        break;
      case "currentSub":
        this.currentSub = msg.name;
        break;
      case "callStackSize":
        // The count precedes the frames; nothing to do but await "call stack".
        break;
      case "callStack":
        this.callStack = msg.frames;
        this.callStackReady = true;
        this.flushPendingStackTrace();
        break;
      case "addressRead":
        this.onAddressRead(msg.read);
        break;
      case "error":
        this.output(`Runtime error at line ${msg.line}.\n`, "stderr");
        this.onStop(msg.line, "exception");
        break;
      case "enterInput":
        this.output("(program is waiting for input)\n");
        break;
      case "quit":
        this.output(`${msg.reason}\n`);
        this.terminate("quit: " + msg.reason);
        break;
      case "unknown":
        this.output(`[vwatch] unhandled: ${msg.command}\n`);
        break;
    }
  }

  // ---- protocol tracing ----------------------------------------------------

  private tracing?: boolean;
  private isTracing(): boolean {
    if (this.tracing === undefined) {
      this.tracing = vscode.workspace
        .getConfiguration("qb64pe")
        .get<boolean>("debug.trace", true);
    }
    return this.tracing;
  }

  private traceRx(msg: ReturnType<typeof interpret>): void {
    if (!this.isTracing()) return;
    let detail = "";
    if (msg.kind === "stopped") detail = `${msg.reason} line ${msg.line}`;
    else if (msg.kind === "currentSub") detail = msg.name;
    else if (msg.kind === "callStack") detail = `${msg.frames.length} frame(s)`;
    else if (msg.kind === "callStackSize") detail = String(msg.count);
    else if (msg.kind === "quit") detail = msg.reason;
    else if (msg.kind === "unknown") detail = msg.command;
    this.output(`  ← ${msg.kind}${detail ? " " + detail : ""}\n`);
  }

  /** After the debuggee announces itself: send the setup sequence, then run. */
  private onHandshake(): void {
    if (this.launched) return;
    this.launched = true;
    if (this.timeoutTimer) clearTimeout(this.timeoutTimer);

    this.send(VWatchOut.Vwatch, "ok"); // MUST be first
    this.send(VWatchOut.LineCount, mkl(this.lineCount));

    const lines = this.allBreakpointLines();
    this.send(VWatchOut.BreakpointCount, mkl(lines.length));
    this.send(VWatchOut.BreakpointList, packLineList(lines));
    this.send(VWatchOut.SkipCount, mkl(0));
    this.send(VWatchOut.SkipList, Buffer.alloc(0));

    // `break` stops at the first line; `run` proceeds (stopping only at a
    // breakpoint on the entry line).
    this.output(
      `Handshake complete; breakpoints at [${lines.join(", ") || "none"}]; ` +
        `${this.stopOnEntry ? "stopping at entry" : "running"}.\n`
    );
    this.send(this.stopOnEntry ? VWatchOut.Break : VWatchOut.Run);
  }

  /**
   * Handle a stop. For a breakpoint with a hit-count and/or condition, decide
   * whether to actually stop: hit-counts are checked synchronously, conditions
   * are evaluated by reading a variable live (so the real stop is deferred until
   * the value arrives). Otherwise report the stop immediately.
   */
  private onStop(line: number, reason: string): void {
    if (reason === "breakpoint") {
      const bp = this.breakpointAt(line);
      if (bp) {
        if (bp.hitCondition) {
          bp.hits += 1;
          if (!hitConditionMet(bp.hitCondition, bp.hits)) {
            this.send(VWatchOut.Run); // skip this hit
            return;
          }
        }
        if (bp.condition) {
          this.checkCondition(line, bp.condition);
          return;
        }
      }
    }
    this.reportStop(line, reason);
  }

  /** Actually pause: map the flat line to its source, then notify VS Code. */
  private reportStop(flatLine: number, reason: string): void {
    const origin = this.fromFlat(flatLine);
    this.currentFile = origin?.file ?? this.program;
    this.currentLine = origin?.line ?? flatLine;
    this.output(
      `Stopped at ${path.basename(this.currentFile)}:${this.currentLine} (${reason}).\n`
    );
    this.callStackReady = false;
    this.callStack = [];
    this.refs.reset(); // variable references are per-stop
    // The debuggee already sends "current sub" with every stop, so only the
    // call stack needs requesting (while it is polling in its main loop).
    this.send(VWatchOut.CallStack);
    const stopped = new StoppedEvent(reason, THREAD_ID);
    // Single-thread program: mark all threads stopped so VS Code reliably
    // switches the toolbar to the paused state (continue/step enabled).
    (stopped.body as DebugProtocol.StoppedEvent["body"]).allThreadsStopped = true;
    this.sendEvent(stopped);
  }

  /** tempIndex -> a deferred conditional-breakpoint decision. */
  private readonly condPending = new Map<
    number,
    { line: number; op: string; rhs: string; varType: string }
  >();

  /**
   * Evaluate a conditional breakpoint by reading its variable live, then either
   * report the stop or resume. Only simple `<var> <op> <literal>` conditions are
   * supported; anything else (or a read failure) stops, which is the safe
   * default for a breakpoint the user placed deliberately.
   */
  private checkCondition(line: number, condition: string): void {
    const parsed = parseCondition(condition);
    const found = parsed
      ? this.findVar(parsed.name.replace(/[%&!#$~]+$/, "").toUpperCase())
      : undefined;
    if (!parsed || !found || found.v.isArray || found.v.isUDT || !this.socket) {
      this.reportStop(line, "breakpoint");
      return;
    }
    const tempIndex = ++this.varSeq;
    this.condPending.set(tempIndex, {
      line,
      op: parsed.op,
      rhs: parsed.rhs,
      varType: found.v.varType,
    });
    this.issueGetVar({
      isLocal: found.isLocal,
      scope: found.isLocal ? this.currentSub : "",
      localIndex: found.v.index,
      varType: found.v.varType,
      varSize: found.v.size,
      tempIndex,
    });
    setTimeout(() => {
      if (this.condPending.delete(tempIndex)) this.reportStop(line, "breakpoint");
    }, 700);
  }

  /** The breakpoint at a flattened line, via the line map. */
  private breakpointAt(flatLine: number): BpInfo | undefined {
    const origin = this.fromFlat(flatLine);
    if (!origin) return undefined;
    return this.breakpoints
      .get(normalizePath(origin.file))
      ?.find((b) => b.line === origin.line);
  }

  /** Every breakpoint as a flattened line number to send to vwatch. */
  private allBreakpointLines(): number[] {
    const set = new Set<number>();
    for (const [key, bps] of this.breakpoints) {
      const byLine = this.flatByFile.get(key);
      for (const b of bps) {
        const flat = byLine?.get(b.line);
        if (flat !== undefined) set.add(flat);
      }
    }
    return [...set].sort((a, b) => a - b);
  }

  private send(command: string, value?: Buffer | string): void {
    if (!this.socket) return;
    if (this.isTracing()) {
      let detail = "";
      if (Buffer.isBuffer(value) && value.length === 4) {
        detail = " " + value.readInt32LE(0);
      } else if (typeof value === "string") {
        detail = " " + value;
      }
      this.output(`  → ${command}${detail}\n`);
    }
    this.socket.write(encode(command, value));
  }

  // ---- compile + spawn -----------------------------------------------------

  private resolveCompilerPath(args: QB64LaunchArguments): string {
    if (args.compilerPath && args.compilerPath.trim().length > 0) {
      return args.compilerPath;
    }
    return vscode.workspace
      .getConfiguration("qb64pe")
      .get<string>("compilerPath", "");
  }

  /**
   * Flatten the program's $INCLUDE graph into a temp file to compile, recording
   * the flattened-line → (file, line) map. `$DEBUG` is appended if absent
   * (a global toggle; appending keeps flattened line numbers intact).
   */
  private prepareCompiledProgram(args: QB64LaunchArguments): void {
    const resolver = createIncludeResolver([path.dirname(this.program)]);
    const result = flatten(normalizePath(this.program), {
      readFile: (p) => {
        try {
          return fs.readFileSync(p, "latin1");
        } catch {
          return null;
        }
      },
      resolve: (spec, from) => resolver(from, spec),
      resolveLibrary: (spec, from) => this.resolveLibrary(spec, from),
    });
    this.origins = result.origins;
    this.flatByFile = buildReverseMap(result.origins, normalizePath);

    const hasDebug = /^[ \t]*\$DEBUG\b/im.test(result.text);
    if (!hasDebug && args.autoAddDebug === false) {
      throw new Error(
        "Program has no $DEBUG metacommand and qb64pe.debug.autoAddDebug is off."
      );
    }
    this.flatText = hasDebug ? result.text : result.text + os.EOL + "$DEBUG" + os.EOL;

    const dir = path.dirname(this.program);
    const base = path.basename(this.program, path.extname(this.program));
    const temp = path.join(dir, `.${base}.debug${path.extname(this.program)}`);
    fs.writeFileSync(temp, this.flatText, "latin1");
    this.compiledProgram = temp;
    this.tempProgram = temp;
    if (this.isTracing()) {
      this.output(
        `Flattened ${this.flatByFile.size} file(s) into ${this.origins.length} lines.\n`
      );
    }
  }

  /**
   * A `DECLARE LIBRARY "spec"` header lives next to its declaring file; after
   * flattening moves the declaration, rewrite the spec to that absolute path so
   * the compiler still finds the header. Only user libraries (a sibling
   * `spec.h`) are rewritten; system libraries are left alone.
   */
  private resolveLibrary(spec: string, fromFile: string): string | null {
    if (!spec) return null;
    const clean = spec.replace(/^\.[\\/]/, "").replace(/\\/g, "/");
    if (path.isAbsolute(clean)) return null;
    const dir = path.dirname(fromFile);
    const hasHeader =
      fs.existsSync(path.join(dir, clean + ".h")) ||
      fs.existsSync(path.join(dir, clean));
    return hasHeader ? path.join(dir, clean).replace(/\\/g, "/") : null;
  }

  /** Flattened line for an editor (file, line), if it maps. */
  private toFlat(file: string, line: number): number | undefined {
    return this.flatByFile.get(normalizePath(file))?.get(line);
  }

  /** Original (file, line) for a flattened line, if it maps. */
  private fromFlat(flatLine: number): LineOrigin | undefined {
    return this.origins[flatLine - 1];
  }

  private exePathFor(sourceFile: string): string {
    const dir = path.dirname(sourceFile);
    const base = path.basename(this.program, path.extname(this.program));
    // Convention: .exe on Windows, .run on Linux/macOS.
    const ext = process.platform === "win32" ? ".exe" : ".run";
    return path.join(dir, base + ext);
  }

  /**
   * Find the executable the compiler actually produced. QB64PE keeps a `.run`
   * extension but drops `.exe` on non-Windows, so probe the likely names.
   */
  private findProducedExe(exePath: string): string | undefined {
    const stem = exePath.replace(/\.(run|exe)$/i, "");
    const candidates = [exePath, stem + ".run", stem + ".exe", stem];
    return candidates.find((p) => {
      try {
        return fs.existsSync(p) && fs.statSync(p).isFile();
      } catch {
        return false;
      }
    });
  }

  private compile(
    compilerPath: string,
    sourceFile: string,
    exePath: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.output(`Compiling ${path.basename(sourceFile)} with $DEBUG...\n`);
      const proc = cp.spawn(
        compilerPath,
        ["-c", sourceFile, "-o", exePath, "-x"],
        { cwd: path.dirname(sourceFile) }
      );
      proc.stdout?.on("data", (d) => this.output(d.toString()));
      proc.stderr?.on("data", (d) => this.output(d.toString(), "stderr"));
      proc.on("error", (err) => {
        this.output(`Failed to run compiler: ${err.message}\n`, "stderr");
        resolve(false);
      });
      proc.on("close", (code) => resolve(code === 0));
    });
  }

  private spawnDebuggee(exePath: string, port: number): void {
    this.output(`Launching (QB64DEBUGPORT=${port})...\n`);
    const child = cp.spawn(exePath, [], {
      cwd: path.dirname(exePath),
      env: { ...process.env, QB64DEBUGPORT: String(port) },
    });
    this.child = child;
    child.stdout?.on("data", (d) => this.output(d.toString()));
    child.stderr?.on("data", (d) => this.output(d.toString(), "stderr"));
    child.on("error", (err) => {
      this.output(`Failed to launch program: ${err.message}\n`, "stderr");
      this.terminate("child error");
    });
    child.on("close", () => {
      // The socket 'close' usually fires first; this is a backstop.
      this.terminate("child close");
    });
  }

  // ---- source mapping ------------------------------------------------------

  private sourceFor(file: string): Source {
    return new Source(path.basename(file), file);
  }

  // ---- teardown ------------------------------------------------------------

  private terminated = false;
  private terminate(reason = "unknown"): void {
    if (!this.terminated) this.output(`Session ending (${reason}).\n`);
    if (this.terminated) return;
    this.terminated = true;
    if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
    try {
      if (this.socket) {
        this.send(VWatchOut.Free);
        this.socket.destroy();
      }
    } catch {
      /* ignore */
    }
    try {
      this.child?.kill();
    } catch {
      /* ignore */
    }
    try {
      this.server?.close();
    } catch {
      /* ignore */
    }
    if (this.tempProgram) {
      try {
        fs.unlinkSync(this.tempProgram);
      } catch {
        /* ignore */
      }
    }
    this.sendEvent(new TerminatedEvent());
  }

  private output(text: string, category: "stdout" | "stderr" = "stdout"): void {
    this.sendEvent(new OutputEvent(text, category));
  }

  private fail(response: DebugProtocol.Response, message: string): void {
    this.output(message + "\n", "stderr");
    this.sendErrorResponse(response, { id: 1001, format: message });
    this.terminate("fail: " + message);
  }
}
