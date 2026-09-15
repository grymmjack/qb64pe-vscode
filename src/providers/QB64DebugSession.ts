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
} from "@vscode/debugadapter";
import { DebugProtocol } from "@vscode/debugprotocol";
import { SymbolIndex, normalizeBase } from "../core/index";
import {
  FrameReader,
  encode,
  mkl,
  packLineList,
  interpret,
  VWatchIn,
  VWatchOut,
  CallStackFrame,
} from "../core/vwatchProtocol";

const THREAD_ID = 1;
const THREAD_NAME = "QB64PE program";

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

  /** Breakpoint lines (1-based) requested by VS Code, keyed by file path. */
  private readonly breakpoints = new Map<string, number[]>();
  /** Whether the handshake/`run` has been sent. */
  private launched = false;
  private stopOnEntry = false;
  private timeoutTimer?: ReturnType<typeof setTimeout>;

  /** Current stop state, for building the stack trace. */
  private currentLine = 0;
  private currentSub = "";
  private callStack: CallStackFrame[] = [];

  constructor(private readonly index: SymbolIndex) {
    super("qb64pe-debug.txt");
    this.setDebuggerLinesStartAt1(true);
    this.setDebuggerColumnsStartAt1(true);
  }

  // ---- DAP lifecycle -------------------------------------------------------

  protected initializeRequest(
    response: DebugProtocol.InitializeResponse,
    _args: DebugProtocol.InitializeRequestArguments
  ): void {
    response.body = response.body || {};
    response.body.supportsConfigurationDoneRequest = true;
    response.body.supportsTerminateRequest = true;
    // M2/M3 capabilities (step back, set variable, etc.) are added as those
    // milestones land.
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
    if (!compilerPath) {
      this.fail(
        response,
        "No QB64PE compiler configured. Set qb64pe.compilerPath or the launch config's compilerPath."
      );
      return;
    }

    // Ensure the source carries $DEBUG so the compiler instruments it. $DEBUG
    // is a global toggle, so appending it to a temp copy does not shift the
    // user's line numbers (keeping vwatch line == editor line).
    try {
      this.prepareCompiledProgram(args);
    } catch (e) {
      this.fail(response, `Could not prepare source: ${e}`);
      return;
    }

    const source = fs.readFileSync(this.program, "latin1");
    this.lineCount = source.split(/\r?\n/).length + 1;

    // Host first, so the debuggee can connect the instant it starts.
    let port: number;
    try {
      port = await this.startServer(args.port ?? 9000);
    } catch (e) {
      this.fail(response, `Could not open a debug port: ${e}`);
      return;
    }

    const exePath = this.exePathFor(this.compiledProgram);
    const ok = await this.compile(compilerPath, this.compiledProgram, exePath);
    if (!ok) {
      this.fail(response, "Compilation failed — see the debug console.");
      return;
    }
    if (!fs.existsSync(exePath)) {
      this.fail(
        response,
        `Compiler reported success but no executable was produced at ${exePath}.`
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
        this.terminate();
      }
    }, timeoutMs);

    this.spawnDebuggee(exePath, port);
    this.sendResponse(response);
  }

  protected setBreakPointsRequest(
    response: DebugProtocol.SetBreakpointsResponse,
    args: DebugProtocol.SetBreakpointsArguments
  ): void {
    const file = args.source.path ?? "";
    const requested = (args.breakpoints ?? []).map((b) => b.line);
    this.breakpoints.set(file, requested);

    // If already connected, apply the delta live.
    if (this.launched && this.socket) {
      // Simplest correct approach: clear this file's breakpoints then set the
      // requested ones. (M4 will scope this per compiled-line mapping.)
      this.send(VWatchOut.ClearAllBreakpoints);
      for (const line of this.allBreakpointLines()) {
        this.send(VWatchOut.SetBreakpoint, mkl(line));
      }
    }

    response.body = {
      breakpoints: requested.map((line) => ({ verified: true, line })),
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
    // M1: a single frame at the current stop. M2 replaces this with the full
    // parsed call stack.
    const frames: StackFrame[] = [
      new StackFrame(
        0,
        this.currentSub || "(main)",
        this.sourceFor(this.program),
        this.currentLine
      ),
    ];
    response.body = { stackFrames: frames, totalFrames: frames.length };
    this.sendResponse(response);
  }

  protected continueRequest(
    response: DebugProtocol.ContinueResponse,
    _args: DebugProtocol.ContinueArguments
  ): void {
    this.send(VWatchOut.Run);
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
    this.terminate();
    this.sendResponse(response);
  }

  protected disconnectRequest(
    response: DebugProtocol.DisconnectResponse,
    _args: DebugProtocol.DisconnectArguments
  ): void {
    this.terminate();
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
    socket.on("data", (chunk) => this.onData(chunk));
    socket.on("error", () => {
      /* handled by close */
    });
    socket.on("close", () => {
      if (this.socket === socket) this.terminate();
    });
  }

  private onData(chunk: Buffer): void {
    this.reader.push(chunk);
    let raw;
    while ((raw = this.reader.next()) !== null) {
      this.dispatch(interpret(raw));
    }
  }

  private dispatch(msg: ReturnType<typeof interpret>): void {
    switch (msg.kind) {
      case "me":
        this.onHandshake();
        break;
      case "hwnd":
        // Window handle; not needed for M1 (used for foreground on Windows).
        break;
      case "stopped":
        this.currentLine = msg.line;
        this.requestCurrentSub();
        this.sendEvent(
          new StoppedEvent(
            msg.reason === "breakpoint" ? "breakpoint" : "step",
            THREAD_ID
          )
        );
        break;
      case "currentSub":
        this.currentSub = msg.name;
        break;
      case "callStack":
        this.callStack = msg.frames;
        break;
      case "error":
        this.output(`Runtime error at line ${msg.line}.\n`, "stderr");
        this.currentLine = msg.line;
        this.sendEvent(new StoppedEvent("exception", THREAD_ID));
        break;
      case "enterInput":
        this.output("(program is waiting for input)\n");
        break;
      case "quit":
        this.output(`${msg.reason}\n`);
        this.terminate();
        break;
      case "unknown":
        this.output(`[vwatch] unhandled: ${msg.command}\n`);
        break;
    }
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
    this.send(this.stopOnEntry ? VWatchOut.Break : VWatchOut.Run);
  }

  private requestCurrentSub(): void {
    this.send(VWatchOut.CurrentSub);
  }

  /** Every breakpoint line across files (M1: effectively the main file). */
  private allBreakpointLines(): number[] {
    const set = new Set<number>();
    for (const lines of this.breakpoints.values()) {
      for (const line of lines) set.add(line);
    }
    return [...set].sort((a, b) => a - b);
  }

  private send(command: string, value?: Buffer | string): void {
    if (!this.socket) return;
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
   * Chooses the file to compile. If the source already has `$DEBUG`, compile it
   * directly. Otherwise (when autoAddDebug is on) write a sibling temp copy with
   * `$DEBUG` appended — appended, so line numbers are unchanged.
   */
  private prepareCompiledProgram(args: QB64LaunchArguments): void {
    const source = fs.readFileSync(this.program, "latin1");
    const hasDebug = /^[ \t]*\$DEBUG\b/im.test(source);
    if (hasDebug) {
      this.compiledProgram = this.program;
      return;
    }
    const autoAdd = args.autoAddDebug ?? true;
    if (!autoAdd) {
      throw new Error(
        "Program has no $DEBUG metacommand and qb64pe.debug.autoAddDebug is off."
      );
    }
    const dir = path.dirname(this.program);
    const base = path.basename(this.program, path.extname(this.program));
    const temp = path.join(dir, `.${base}.debug${path.extname(this.program)}`);
    fs.writeFileSync(temp, source + os.EOL + "$DEBUG" + os.EOL, "latin1");
    this.compiledProgram = temp;
    this.tempProgram = temp;
  }

  private exePathFor(sourceFile: string): string {
    const dir = path.dirname(sourceFile);
    const base = path.basename(this.program, path.extname(this.program));
    return path.join(dir, base + ".exe");
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
      this.terminate();
    });
    child.on("close", () => {
      // The socket 'close' usually fires first; this is a backstop.
      this.terminate();
    });
  }

  // ---- source mapping ------------------------------------------------------

  private sourceFor(file: string): Source {
    return new Source(path.basename(file), file);
  }

  /** Resolve a SUB/FUNCTION name to its declaring file+line via the index. */
  protected routineLocation(
    name: string
  ): { file: string; line: number } | undefined {
    const hits = this.index.lookupBase(normalizeBase(name));
    const routine = hits.find(
      (s) => s.type === "SUB" || s.type === "FUNCTION"
    );
    if (routine) return { file: routine.file, line: routine.line + 1 };
    return undefined;
  }

  // ---- teardown ------------------------------------------------------------

  private terminated = false;
  private terminate(): void {
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
    this.terminate();
  }
}
