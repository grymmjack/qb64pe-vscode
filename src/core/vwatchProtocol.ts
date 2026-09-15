/**
 * QB64PE `vwatch` debugger protocol — a pure, vscode-free codec.
 *
 * Ground truth: `internal/support/vwatch/vwatch.bm` in the QB64PE source.
 * The debuggee (a program compiled with `$DEBUG`) connects back to us as a TCP
 * *client*; we are the *host*. Every message on the wire is:
 *
 *     MKL$(len) + payload
 *
 * where `MKL$(len)` is a 4-byte little-endian signed LONG giving the payload's
 * byte length, and the payload is `command:value` split on the FIRST colon.
 * `value` may be ASCII text or binary-packed (MKL$/MKI$/_MK$) depending on the
 * command — see `vwatch.bm`'s `SendCommand`/`GetCommand`.
 *
 * This module does no I/O and imports no `vscode`; it turns bytes into structs
 * and structs into bytes, so it can be unit-tested in plain Node.
 */

// ---- low-level packing (mirrors QB64's MKL$/MKI$ + CVL/CVI) ----------------

/** 4-byte little-endian signed LONG, as QB64's `MKL$`. */
export function mkl(value: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeInt32LE(value | 0, 0);
  return b;
}

/** Inverse of {@link mkl} — QB64's `CVL`. Reads 4 bytes LE at `offset`. */
export function cvl(buf: Buffer, offset = 0): number {
  return buf.readInt32LE(offset);
}

/** 2-byte little-endian signed INTEGER, as QB64's `MKI$`. */
export function mki(value: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(value & 0xffff, 0);
  return b;
}

/** Inverse of {@link mki} — QB64's `CVI`. */
export function cvi(buf: Buffer, offset = 0): number {
  return buf.readInt16LE(offset);
}

// ---- command vocabulary ----------------------------------------------------

/** Commands the debuggee sends to us (host). See `vwatch.bm` send sites. */
export const VWatchIn = {
  Me: "me", // me:<COMMAND$(0)> — the exe path (handshake)
  Hwnd: "hwnd", // hwnd:<_MK$(_OFFSET, handle)> — window handle
  LineNumber: "line number", // line number:MKL$(line) — stopped at a plain line
  Breakpoint: "breakpoint", // breakpoint:MKL$(line) — stopped at a breakpoint
  CurrentSub: "current sub", // current sub:<name>
  CallStackSize: "call stack size", // call stack size:MKL$(n)
  CallStack: "call stack", // call stack:<frames CHR$(0)-separated>
  AddressRead: "address read", // address read:MKL$(idx)+MKL$(arr)+MKL$(el)+MKL$(store)+bytes
  Watchpoint: "watchpoint", // watchpoint:...
  Error: "error", // error:MKL$(line)
  EnterInput: "enter input", // enter input:MKL$(line)
  LeaveInput: "leave input", // leave input
  Quit: "quit", // quit:<reason>
} as const;

/** Commands we (host) send to the debuggee. See the CASE dispatch in `vwatch.bm`. */
export const VWatchOut = {
  Vwatch: "vwatch", // vwatch:ok — MUST be sent first or the debuggee disconnects
  LineCount: "line count", // line count:MKL$(n) — sizes the breakpoint/skip arrays
  BreakpointCount: "breakpoint count", // breakpoint count:MKL$(n)
  BreakpointList: "breakpoint list", // breakpoint list:<MKL$(line) * n>
  Hwnd: "hwnd", // hwnd:<_MK$(_OFFSET, handle)>
  SkipCount: "skip count",
  SkipList: "skip list",
  Run: "run",
  Break: "break",
  SetBreakpoint: "set breakpoint", // set breakpoint:MKL$(line)
  ClearBreakpoint: "clear breakpoint", // clear breakpoint:MKL$(line)
  SetSkipLine: "set skip line",
  ClearSkipLine: "clear skip line",
  ClearAllBreakpoints: "clear all breakpoints",
  ClearAllSkips: "clear all skips",
  RunToLine: "run to line", // run to line:MKL$(line)
  Step: "step",
  StepOver: "step over",
  StepOut: "step out",
  Free: "free", // detach cleanly and let the program run
  CallStack: "call stack", // request the call stack
  GetGlobalVar: "get global var",
  GetLocalVar: "get local var",
  SetGlobalAddress: "set global address",
  SetLocalAddress: "set local address",
  CurrentSub: "current sub", // request the current sub name
  SetNextLine: "set next line", // set next line:MKL$(line)
} as const;

// ---- parsed messages -------------------------------------------------------

export interface RawMessage {
  command: string;
  /** Everything after the first `:` (may be empty; may be binary). */
  value: Buffer;
}

export type VWatchMessage =
  | { kind: "me"; command: string }
  | { kind: "hwnd"; handle: Buffer }
  | { kind: "stopped"; reason: "step" | "breakpoint"; line: number }
  | { kind: "currentSub"; name: string }
  | { kind: "callStackSize"; count: number }
  | { kind: "callStack"; frames: CallStackFrame[] }
  | { kind: "addressRead"; read: AddressRead }
  | { kind: "error"; line: number }
  | { kind: "enterInput"; line: number }
  | { kind: "leaveInput" }
  | { kind: "quit"; reason: string }
  | { kind: "unknown"; command: string; value: Buffer };

/** One call-stack frame as sent by vwatch: `subname, line NNN`. */
export interface CallStackFrame {
  /** The SUB/FUNCTION name (empty string means the main module). */
  sub: string;
  /** The source line the frame is executing at, or `undefined` if unparsed. */
  line?: number;
  /** The original frame text, verbatim. */
  raw: string;
}

export interface AddressRead {
  tempIndex: number;
  arrayIndex: number;
  element: number;
  storage: number;
  /** The raw variable bytes; decode with {@link decodeValue}. */
  bytes: Buffer;
}

// ---- framing ---------------------------------------------------------------

/**
 * Incremental reader for the `MKL$(len)+payload` framing. Feed it whatever
 * bytes arrive from the socket (in any chunking) and pull complete messages.
 */
export class FrameReader {
  private buffer: Buffer = Buffer.alloc(0);

  /** Append received bytes. */
  push(chunk: Buffer): void {
    this.buffer =
      this.buffer.length === 0 ? chunk : Buffer.concat([this.buffer, chunk]);
  }

  /**
   * Pull the next complete frame, or `null` if not enough bytes yet. Mirrors
   * `GetCommand` in `vwatch.bm`: read the 4-byte length, then that many bytes.
   */
  next(): RawMessage | null {
    if (this.buffer.length < 4) return null;
    const size = cvl(this.buffer, 0);
    if (size <= 0) {
      // Defensive: a non-positive size would stall the stream; drop the header.
      this.buffer = this.buffer.subarray(4);
      return null;
    }
    if (this.buffer.length < 4 + size) return null;
    const payload = this.buffer.subarray(4, 4 + size);
    this.buffer = this.buffer.subarray(4 + size);
    return splitMessage(payload);
  }

  /** Pull every frame currently available. */
  drain(): RawMessage[] {
    const out: RawMessage[] = [];
    let m: RawMessage | null;
    while ((m = this.next()) !== null) out.push(m);
    return out;
  }
}

/** Split a payload into `{command, value}` on the first `:` (as `GetCommand`). */
export function splitMessage(payload: Buffer): RawMessage {
  const colon = payload.indexOf(0x3a); // ':'
  if (colon === -1) {
    return { command: payload.toString("latin1"), value: Buffer.alloc(0) };
  }
  return {
    command: payload.subarray(0, colon).toString("latin1"),
    value: payload.subarray(colon + 1),
  };
}

/** Encode a `command`(+`value`) into a length-framed buffer for the wire. */
export function encode(command: string, value?: Buffer | string): Buffer {
  const cmd = Buffer.from(command, "latin1");
  let payload: Buffer;
  if (value === undefined) {
    payload = cmd;
  } else {
    const val = typeof value === "string" ? Buffer.from(value, "latin1") : value;
    payload = Buffer.concat([cmd, Buffer.from(":", "latin1"), val]);
  }
  return Buffer.concat([mkl(payload.length), payload]);
}

/** Pack a list of line numbers as a `breakpoint list`/`skip list` value. */
export function packLineList(lines: number[]): Buffer {
  return Buffer.concat(lines.map((n) => mkl(n)));
}

// ---- message interpretation ------------------------------------------------

/**
 * Turn a raw `{command, value}` into a typed {@link VWatchMessage}. Unknown
 * commands are preserved (`kind: "unknown"`) rather than throwing, so protocol
 * drift across QB64PE versions degrades gracefully.
 */
export function interpret(raw: RawMessage): VWatchMessage {
  switch (raw.command) {
    case VWatchIn.Me:
      return { kind: "me", command: raw.value.toString("latin1") };
    case VWatchIn.Hwnd:
      return { kind: "hwnd", handle: Buffer.from(raw.value) };
    case VWatchIn.LineNumber:
      return { kind: "stopped", reason: "step", line: cvl(raw.value, 0) };
    case VWatchIn.Breakpoint:
      return { kind: "stopped", reason: "breakpoint", line: cvl(raw.value, 0) };
    case VWatchIn.CurrentSub:
      return { kind: "currentSub", name: raw.value.toString("latin1") };
    case VWatchIn.CallStackSize:
      return { kind: "callStackSize", count: cvl(raw.value, 0) };
    case VWatchIn.CallStack:
      return { kind: "callStack", frames: parseCallStack(raw.value) };
    case VWatchIn.AddressRead:
      return { kind: "addressRead", read: parseAddressRead(raw.value) };
    case VWatchIn.Error:
      return { kind: "error", line: cvl(raw.value, 0) };
    case VWatchIn.EnterInput:
      return { kind: "enterInput", line: cvl(raw.value, 0) };
    case VWatchIn.LeaveInput:
      return { kind: "leaveInput" };
    case VWatchIn.Quit:
      return { kind: "quit", reason: raw.value.toString("latin1") };
    default:
      return {
        kind: "unknown",
        command: raw.command,
        value: Buffer.from(raw.value),
      };
  }
}

/**
 * Parse a `call stack:` value. vwatch joins frames with CHR$(0); each frame is
 * `subname, line NNN` (`SendCallStack` in `vwatch.bm`). An empty value means an
 * empty stack (only the main module is active).
 */
export function parseCallStack(value: Buffer): CallStackFrame[] {
  const text = value.toString("latin1");
  if (text.length === 0) return [];
  return text.split("\0").map(parseFrame);
}

/** Parse one `subname, line NNN` frame. */
export function parseFrame(raw: string): CallStackFrame {
  const m = /^(.*?),\s*line\s+(-?\d+)\s*$/i.exec(raw);
  if (m) {
    return { sub: m[1].trim(), line: parseInt(m[2], 10), raw };
  }
  return { sub: raw.trim(), raw };
}

/**
 * Parse an `address read:` value:
 * `MKL$(tempIndex)+MKL$(arrayIndex)+MKL$(element)+MKL$(storage)+bytes`.
 */
export function parseAddressRead(value: Buffer): AddressRead {
  return {
    tempIndex: cvl(value, 0),
    arrayIndex: cvl(value, 4),
    element: cvl(value, 8),
    storage: cvl(value, 12),
    bytes: Buffer.from(value.subarray(16)),
  };
}

// ---- typed variable-value decode ------------------------------------------

/**
 * QB64PE variable storage type names, as they travel in `varType$` and are
 * decoded by `_CV`/`CVS`/`CVD` in `ide_methods.bas` (`address read` handler).
 */
export type QB64Type =
  | "_BYTE"
  | "_UNSIGNED _BYTE"
  | "INTEGER"
  | "_UNSIGNED INTEGER"
  | "LONG"
  | "_UNSIGNED LONG"
  | "_INTEGER64"
  | "_UNSIGNED _INTEGER64"
  | "SINGLE"
  | "DOUBLE"
  | "_FLOAT"
  | "_OFFSET"
  | "_UNSIGNED _OFFSET"
  | "STRING";

/**
 * Decode the raw little-endian bytes of a variable into a display string,
 * matching the `SELECT CASE tempVarType$` decode in `ide_methods.bas`. Returns
 * `null` when there are not enough bytes for the declared type.
 *
 * `_FLOAT` (80-bit extended / `long double`) is not representable by Node's
 * `Buffer` readers; it is decoded to the nearest double from its low 8 bytes as
 * a best effort and flagged so callers can annotate the value.
 */
export function decodeValue(
  type: string,
  bytes: Buffer
): { text: string; approximate?: boolean } | null {
  const normalized = type.trim().toUpperCase();

  // Fixed- and variable-length strings: the caller has already resolved the
  // string bytes, so just present them (trailing NULs trimmed).
  if (normalized === "STRING" || normalized.startsWith("STRING *")) {
    return { text: bytes.toString("latin1").replace(/\0+$/, "") };
  }

  const need = (n: number) => bytes.length >= n;
  switch (normalized) {
    case "_BYTE":
      return need(1) ? { text: String(bytes.readInt8(0)) } : null;
    case "_UNSIGNED _BYTE":
      return need(1) ? { text: String(bytes.readUInt8(0)) } : null;
    case "INTEGER":
      return need(2) ? { text: String(bytes.readInt16LE(0)) } : null;
    case "_UNSIGNED INTEGER":
      return need(2) ? { text: String(bytes.readUInt16LE(0)) } : null;
    case "LONG":
      return need(4) ? { text: String(bytes.readInt32LE(0)) } : null;
    case "_UNSIGNED LONG":
      return need(4) ? { text: String(bytes.readUInt32LE(0)) } : null;
    case "_INTEGER64":
      return need(8) ? { text: bytes.readBigInt64LE(0).toString() } : null;
    case "_UNSIGNED _INTEGER64":
      return need(8) ? { text: bytes.readBigUInt64LE(0).toString() } : null;
    case "SINGLE":
      return need(4) ? { text: String(bytes.readFloatLE(0)) } : null;
    case "DOUBLE":
      return need(8) ? { text: String(bytes.readDoubleLE(0)) } : null;
    case "_OFFSET":
      return need(8) ? { text: bytes.readBigInt64LE(0).toString() } : null;
    case "_UNSIGNED _OFFSET":
      return need(8) ? { text: bytes.readBigUInt64LE(0).toString() } : null;
    case "_FLOAT":
      // 80-bit extended precision; approximate from the low 8 bytes.
      return need(8)
        ? { text: String(bytes.readDoubleLE(0)), approximate: true }
        : null;
    default:
      return null;
  }
}
