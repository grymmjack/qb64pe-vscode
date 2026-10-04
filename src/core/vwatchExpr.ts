/**
 * Watch / hover expressions for the debugger (vscode-free).
 *
 * vwatch can only read one variable at a time, so an expression such as
 * `(t * f) - INT(t * f)` is parsed here, its variables are fetched through an
 * injected {@link ExprEnv} (async, since every read is a round trip to the
 * debuggee), and the arithmetic is done locally with QB64 semantics: `^` binds
 * tighter than unary minus, `\` and `MOD` round their operands, comparisons
 * and logic yield -1 / 0, and AND/OR/XOR/NOT are bitwise.
 *
 * User FUNCTIONs cannot be called (vwatch cannot run code); a fixed set of
 * pure built-ins (INT, ABS, MID$, _RGB32, ...) is evaluated here instead.
 */

export type Value = number | string;

export class ExprError extends Error {}

export type Expr =
  | { kind: "num"; value: number }
  | { kind: "str"; value: string }
  | { kind: "name"; name: string }
  | { kind: "call"; name: string; args: Expr[] }
  | { kind: "unary"; op: string; operand: Expr }
  | { kind: "binary"; op: string; left: Expr; right: Expr };

/** What the evaluator needs from the debug session. */
export interface ExprEnv {
  /** True when `name` (sigil-free, any case) is an array variable in scope. */
  isArray(name: string): boolean;
  /** One array element. */
  element(name: string, indexes: number[]): Promise<Value>;
  /** A scalar variable, `a.b.c` member path, or CONST; throws ExprError when unknown. */
  value(name: string): Promise<Value>;
}

// ---- lexer -----------------------------------------------------------------

type Tok =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "id"; v: string }
  | { t: "op"; v: string }
  | { t: "end" };

const WORD_OPS = new Set(["MOD", "AND", "OR", "XOR", "EQV", "IMP", "NOT"]);

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    let m: RegExpExecArray | null;
    if ((m = /^\s+/.exec(rest))) {
      i += m[0].length;
    } else if ((m = /^"([^"]*)"?/.exec(rest))) {
      out.push({ t: "str", v: m[1] });
      i += m[0].length;
    } else if ((m = /^&([HOB])([0-9A-F]+)(?:~?(?:%%|&&|%|&))?/i.exec(rest))) {
      const radix = { H: 16, O: 8, B: 2 }[m[1].toUpperCase() as "H" | "O" | "B"];
      const n = parseInt(m[2], radix);
      if (Number.isNaN(n)) throw new ExprError(`bad number ${m[0]}`);
      out.push({ t: "num", v: n });
      i += m[0].length;
    } else if ((m = /^(\d+\.?\d*|\.\d+)(?:([ED])([+-]?\d+))?(?:##|#|!|~?(?:%%|&&|%|&))?/i.exec(rest))) {
      out.push({ t: "num", v: Number(m[1] + (m[2] ? `e${m[3]}` : "")) });
      i += m[0].length;
    } else if ((m = /^[A-Za-z_][A-Za-z0-9_.]*(?:\$|~?(?:%%|&&|##|[%&!#`]))?/.exec(rest))) {
      const word = m[0].toUpperCase();
      out.push(WORD_OPS.has(word) ? { t: "op", v: word } : { t: "id", v: m[0] });
      i += m[0].length;
    } else if ((m = /^(<>|<=|>=|=<|=>|><|[-+*/\\^()=<>,])/.exec(rest))) {
      const v = { "=<": "<=", "=>": ">=", "><": "<>" }[m[0]] ?? m[0];
      out.push({ t: "op", v });
      i += m[0].length;
    } else {
      throw new ExprError(`unexpected '${src[i]}'`);
    }
  }
  out.push({ t: "end" });
  return out;
}

// ---- parser (Pratt) --------------------------------------------------------

/** Binding powers, QB64 precedence (low → high). */
const INFIX: Record<string, number> = {
  IMP: 1,
  EQV: 2,
  XOR: 3,
  OR: 4,
  AND: 5,
  "=": 7, "<>": 7, "<": 7, ">": 7, "<=": 7, ">=": 7,
  "+": 8, "-": 8,
  MOD: 9,
  "\\": 10,
  "*": 11, "/": 11,
  "^": 13,
};
const NOT_BP = 6;
const NEG_BP = 12;

export function parseExpression(src: string): Expr {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => {
    const t = toks[p];
    return t.t === "op" && t.v === v;
  };
  const expect = (v: string) => {
    if (!isOp(v)) throw new ExprError(`expected '${v}'`);
    p++;
  };

  const parse = (minBp: number): Expr => {
    let left = prefix();
    for (;;) {
      const t = peek();
      if (t.t !== "op") break;
      const bp = INFIX[t.v];
      if (bp === undefined || bp <= minBp) break;
      p++;
      left = { kind: "binary", op: t.v, left, right: parse(bp) };
    }
    return left;
  };

  const prefix = (): Expr => {
    const t = toks[p++];
    switch (t.t) {
      case "num":
        return { kind: "num", value: t.v };
      case "str":
        return { kind: "str", value: t.v };
      case "id": {
        if (!isOp("(")) return { kind: "name", name: t.v };
        p++;
        const args: Expr[] = [];
        if (!isOp(")")) {
          do args.push(parse(0));
          while (isOp(",") && ++p);
        }
        expect(")");
        return { kind: "call", name: t.v, args };
      }
      case "op":
        if (t.v === "(") {
          const inner = parse(0);
          expect(")");
          return inner;
        }
        if (t.v === "-" || t.v === "+") return { kind: "unary", op: t.v, operand: parse(NEG_BP) };
        if (t.v === "NOT") return { kind: "unary", op: "NOT", operand: parse(NOT_BP) };
        throw new ExprError(`unexpected '${t.v}'`);
      default:
        throw new ExprError("incomplete expression");
    }
  };

  const expr = parse(0);
  if (peek().t !== "end") throw new ExprError("unexpected text after expression");
  return expr;
}

// ---- evaluation ------------------------------------------------------------

const num = (v: Value, what: string): number => {
  if (typeof v !== "number") throw new ExprError(`type mismatch: ${what} needs a number`);
  return v;
};
const str = (v: Value, what: string): string => {
  if (typeof v !== "string") throw new ExprError(`type mismatch: ${what} needs a string`);
  return v;
};

/** Round half to even, like QB64's CINT/CLNG and integer-operator coercion. */
export function roundEven(x: number): number {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
}

const big = (x: number) => BigInt(roundEven(x));
const truth = (b: boolean) => (b ? -1 : 0);

function arity(name: string, args: Value[], min: number, max = min): void {
  if (args.length < min || args.length > max) {
    throw new ExprError(`${name} takes ${min === max ? min : `${min}-${max}`} argument(s)`);
  }
}

/** Pure QB64 built-ins evaluable without the debuggee. Names are upper-case, sigil included. */
const BUILTINS: Record<string, (a: Value[], n: string) => Value> = {
  ABS: (a, n) => (arity(n, a, 1), Math.abs(num(a[0], n))),
  SGN: (a, n) => (arity(n, a, 1), Math.sign(num(a[0], n))),
  INT: (a, n) => (arity(n, a, 1), Math.floor(num(a[0], n))),
  FIX: (a, n) => (arity(n, a, 1), Math.trunc(num(a[0], n))),
  CINT: (a, n) => (arity(n, a, 1), roundEven(num(a[0], n))),
  CLNG: (a, n) => (arity(n, a, 1), roundEven(num(a[0], n))),
  CSNG: (a, n) => (arity(n, a, 1), Math.fround(num(a[0], n))),
  CDBL: (a, n) => (arity(n, a, 1), num(a[0], n)),
  _ROUND: (a, n) => (arity(n, a, 1), roundEven(num(a[0], n))),
  _CEIL: (a, n) => (arity(n, a, 1), Math.ceil(num(a[0], n))),
  SQR: (a, n) => (arity(n, a, 1), Math.sqrt(num(a[0], n))),
  SIN: (a, n) => (arity(n, a, 1), Math.sin(num(a[0], n))),
  COS: (a, n) => (arity(n, a, 1), Math.cos(num(a[0], n))),
  TAN: (a, n) => (arity(n, a, 1), Math.tan(num(a[0], n))),
  ATN: (a, n) => (arity(n, a, 1), Math.atan(num(a[0], n))),
  EXP: (a, n) => (arity(n, a, 1), Math.exp(num(a[0], n))),
  LOG: (a, n) => (arity(n, a, 1), Math.log(num(a[0], n))),
  _ATAN2: (a, n) => (arity(n, a, 2), Math.atan2(num(a[0], n), num(a[1], n))),
  _HYPOT: (a, n) => (arity(n, a, 2), Math.hypot(num(a[0], n), num(a[1], n))),
  _PI: (a, n) => (arity(n, a, 0, 1), Math.PI * (a.length ? num(a[0], n) : 1)),
  _MIN: (a, n) => (arity(n, a, 2), Math.min(num(a[0], n), num(a[1], n))),
  _MAX: (a, n) => (arity(n, a, 2), Math.max(num(a[0], n), num(a[1], n))),
  _SHL: (a, n) => (arity(n, a, 2), Number(big(num(a[0], n)) << big(num(a[1], n)))),
  _SHR: (a, n) => (arity(n, a, 2), Number(big(num(a[0], n)) >> big(num(a[1], n)))),
  _RGB32: (a, n) => {
    arity(n, a, 1, 4);
    const c = a.map((v) => Math.min(255, Math.max(0, roundEven(num(v, n)))));
    if (c.length === 1) c.push(c[0], c[0]);
    if (c.length === 2) return ((c[1] << 24) | (c[0] << 16) | (c[0] << 8) | c[0]) >>> 0;
    const alpha = c.length === 4 ? c[3] : 255;
    return ((alpha << 24) | (c[0] << 16) | (c[1] << 8) | c[2]) >>> 0;
  },
  _RGBA32: (a, n) => {
    arity(n, a, 4);
    const c = a.map((v) => Math.min(255, Math.max(0, roundEven(num(v, n)))));
    return ((c[3] << 24) | (c[0] << 16) | (c[1] << 8) | c[2]) >>> 0;
  },
  _RED32: (a, n) => (arity(n, a, 1), (num(a[0], n) >>> 16) & 255),
  _GREEN32: (a, n) => (arity(n, a, 1), (num(a[0], n) >>> 8) & 255),
  _BLUE32: (a, n) => (arity(n, a, 1), num(a[0], n) & 255),
  _ALPHA32: (a, n) => (arity(n, a, 1), (num(a[0], n) >>> 24) & 255),
  LEN: (a, n) => (arity(n, a, 1), str(a[0], n).length),
  ASC: (a, n) => {
    arity(n, a, 1, 2);
    const s = str(a[0], n);
    const pos = a.length > 1 ? num(a[1], n) : 1;
    if (pos < 1 || pos > s.length) throw new ExprError("ASC: position out of range");
    return s.charCodeAt(pos - 1);
  },
  VAL: (a, n) => {
    arity(n, a, 1);
    const m = /^\s*(&H[0-9A-F]+|&O[0-7]+|&B[01]+|[-+]?(\d+\.?\d*|\.\d+)([ED][-+]?\d+)?)/i.exec(str(a[0], n));
    if (!m) return 0;
    const t = m[1];
    if (t.startsWith("&")) return parseInt(t.slice(2), { H: 16, O: 8, B: 2 }[t[1].toUpperCase() as "H"]);
    return Number(t.replace(/[ED]/i, "e"));
  },
  INSTR: (a, n) => {
    arity(n, a, 2, 3);
    const [start, hay, needle] = a.length === 3 ? [num(a[0], n), a[1], a[2]] : [1, a[0], a[1]];
    return str(hay, n).indexOf(str(needle, n), Math.max(0, start - 1)) + 1;
  },
  "CHR$": (a, n) => (arity(n, a, 1), String.fromCharCode(num(a[0], n) & 255)),
  "STR$": (a, n) => {
    arity(n, a, 1);
    const v = num(a[0], n);
    return (v >= 0 ? " " : "") + formatNumber(v);
  },
  "LEFT$": (a, n) => (arity(n, a, 2), str(a[0], n).slice(0, Math.max(0, num(a[1], n)))),
  "RIGHT$": (a, n) => {
    arity(n, a, 2);
    const s = str(a[0], n);
    const k = Math.max(0, num(a[1], n));
    return k === 0 ? "" : s.slice(-k);
  },
  "MID$": (a, n) => {
    arity(n, a, 2, 3);
    const s = str(a[0], n);
    const start = Math.max(1, num(a[1], n)) - 1;
    return a.length > 2 ? s.substr(start, Math.max(0, num(a[2], n))) : s.slice(start);
  },
  "UCASE$": (a, n) => (arity(n, a, 1), str(a[0], n).toUpperCase()),
  "LCASE$": (a, n) => (arity(n, a, 1), str(a[0], n).toLowerCase()),
  "LTRIM$": (a, n) => (arity(n, a, 1), str(a[0], n).replace(/^ +/, "")),
  "RTRIM$": (a, n) => (arity(n, a, 1), str(a[0], n).replace(/ +$/, "")),
  "_TRIM$": (a, n) => (arity(n, a, 1), str(a[0], n).replace(/^ +| +$/g, "")),
  "SPACE$": (a, n) => (arity(n, a, 1), " ".repeat(Math.max(0, num(a[0], n)))),
  "STRING$": (a, n) => {
    arity(n, a, 2);
    const ch = typeof a[1] === "string" ? a[1].charAt(0) : String.fromCharCode(a[1] & 255);
    return ch.repeat(Math.max(0, num(a[0], n)));
  },
  "HEX$": (a, n) => (arity(n, a, 1), big(num(a[0], n)).toString(16).toUpperCase()),
  "OCT$": (a, n) => (arity(n, a, 1), big(num(a[0], n)).toString(8)),
  "_BIN$": (a, n) => (arity(n, a, 1), big(num(a[0], n)).toString(2)),
};

/** Built-ins usable without parentheses. */
const NULLARY = new Set(["_PI"]);

function builtin(name: string): ((a: Value[], n: string) => Value) | undefined {
  const upper = name.toUpperCase();
  // Numeric built-ins may carry a sigil (`_PI#`); string ones keep their `$`.
  return BUILTINS[upper] ?? BUILTINS[upper.replace(/~?(?:%%|&&|##|[%&!#`])$/, "")];
}

function stripSigil(name: string): string {
  return name.replace(/[%&!#$~`]+$/, "");
}

async function evalNode(e: Expr, env: ExprEnv): Promise<Value> {
  switch (e.kind) {
    case "num":
    case "str":
      return e.value;
    case "name": {
      if (NULLARY.has(e.name.toUpperCase())) return builtin(e.name)!([], e.name.toUpperCase());
      return env.value(e.name);
    }
    case "call": {
      const args: Value[] = [];
      for (const a of e.args) args.push(await evalNode(a, env));
      if (env.isArray(stripSigil(e.name))) {
        return env.element(
          stripSigil(e.name),
          args.map((v) => roundEven(num(v, "array index")))
        );
      }
      const fn = builtin(e.name);
      if (!fn) throw new ExprError(`cannot call ${e.name}() while debugging`);
      return fn(args, e.name.toUpperCase());
    }
    case "unary": {
      const v = await evalNode(e.operand, env);
      if (e.op === "-") return -num(v, "-");
      if (e.op === "+") return num(v, "+");
      return Number(~big(num(v, "NOT")));
    }
    case "binary": {
      const l = await evalNode(e.left, env);
      const r = await evalNode(e.right, env);
      return binary(e.op, l, r);
    }
  }
}

function binary(op: string, l: Value, r: Value): Value {
  if (["=", "<>", "<", ">", "<=", ">="].includes(op)) {
    if (typeof l !== typeof r) throw new ExprError(`type mismatch in '${op}'`);
    switch (op) {
      case "=": return truth(l === r);
      case "<>": return truth(l !== r);
      case "<": return truth(l < r);
      case ">": return truth(l > r);
      case "<=": return truth(l <= r);
      default: return truth(l >= r);
    }
  }
  if (op === "+" && typeof l === "string") return l + str(r, "+");
  const a = num(l, op);
  const b = num(r, op);
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/":
      if (b === 0) throw new ExprError("division by zero");
      return a / b;
    case "^": return Math.pow(a, b);
    case "\\":
    case "MOD": {
      const x = roundEven(a);
      const y = roundEven(b);
      if (y === 0) throw new ExprError("division by zero");
      return op === "\\" ? Math.trunc(x / y) : x % y;
    }
    case "AND": return Number(big(a) & big(b));
    case "OR": return Number(big(a) | big(b));
    case "XOR": return Number(big(a) ^ big(b));
    case "EQV": return Number(~(big(a) ^ big(b)));
    case "IMP": return Number(~big(a) | big(b));
  }
  throw new ExprError(`unknown operator ${op}`);
}

/** Evaluate `src` against `env`. Throws ExprError on syntax or runtime errors. */
export async function evaluateExpression(src: string, env: ExprEnv): Promise<Value> {
  return evalNode(parseExpression(src), env);
}

/** Shortest faithful rendering: integers exactly, floats to 15 significant digits. */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n)) return String(n);
  return String(Number(n.toPrecision(15)));
}

/** Render a result the way the Variables view does (strings quoted). */
export function formatResult(v: Value): string {
  return typeof v === "string" ? `"${v}"` : formatNumber(v);
}
