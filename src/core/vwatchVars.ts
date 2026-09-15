/**
 * Decode the QB64PE compiler's generated variable table so the debugger can
 * request live values.
 *
 * When a program is compiled with `$DEBUG`, the compiler emits, into its
 * generated C (`internal/temp/maindata.txt` for module-level variables and the
 * per-routine `dataN.txt` files for locals), a table mapping each variable to
 * its slot in `vwatch_global_vars[]` / `vwatch_local_vars[]`:
 *
 *     vwatch_global_vars[12] = &__SINGLE_X;
 *     vwatch_local_vars[0]   = &_SUB_GREET_INTEGER_N;
 *
 * That slot index is the `localIndex` the vwatch protocol needs for a
 * `get global var` / `get local var` request (see the vwatch host in
 * `ide_methods.bas`). The C name encodes scope, type and name:
 *
 *   - global:  `_` + `` + `_` + <TYPE> + `_` + <NAME>            → `__SINGLE_X`
 *   - local:   `_` + <SCOPE> + `_` + <TYPE> + `_` + <NAME>       → `_SUB_GREET_INTEGER_N`
 *   - arrays:  an `ARRAY_` marker precedes <TYPE>                 → `__ARRAY_SINGLE_BALL`
 *
 * This module is vscode-free and unit-tested.
 */

export interface VarSlot {
  /** `localIndex`: the slot in vwatch_global_vars[] / vwatch_local_vars[]. */
  index: number;
  /** Raw C name, e.g. `__SINGLE_X` or `_SUB_GREET_INTEGER_N`. */
  cname: string;
}

export interface ResolvedVar {
  index: number;
  /** Display name (bare, upper-case as the compiler stores it). */
  name: string;
  /** QB64 type string for the get-var request, e.g. `INTEGER`, `_UNSIGNED LONG`. */
  varType: string;
  /** Byte size to request. */
  size: number;
  isArray: boolean;
}

/** The compiler-name token for each type, longest first so matching is greedy. */
const TYPE_TOKENS: Array<{ token: string; varType: string; size: number }> = [
  { token: "_UNSIGNED_INTEGER64", varType: "_UNSIGNED _INTEGER64", size: 8 },
  { token: "_UNSIGNED_INTEGER", varType: "_UNSIGNED INTEGER", size: 2 },
  { token: "_UNSIGNED_OFFSET", varType: "_UNSIGNED _OFFSET", size: 8 },
  { token: "_UNSIGNED_LONG", varType: "_UNSIGNED LONG", size: 4 },
  { token: "_UNSIGNED_BYTE", varType: "_UNSIGNED _BYTE", size: 1 },
  { token: "_INTEGER64", varType: "_INTEGER64", size: 8 },
  { token: "_OFFSET", varType: "_OFFSET", size: 8 },
  { token: "_FLOAT", varType: "_FLOAT", size: 32 },
  { token: "_BYTE", varType: "_BYTE", size: 1 },
  { token: "INTEGER", varType: "INTEGER", size: 2 },
  { token: "SINGLE", varType: "SINGLE", size: 4 },
  { token: "DOUBLE", varType: "DOUBLE", size: 8 },
  { token: "STRING", varType: "STRING", size: 12 }, // offset + length descriptor (64-bit)
  { token: "LONG", varType: "LONG", size: 4 },
];

const GLOBAL_RE = /vwatch_global_vars\[\s*(\d+)\s*\]\s*=\s*&([A-Za-z0-9_]+)\s*;/g;
const LOCAL_RE = /vwatch_local_vars\[\s*(\d+)\s*\]\s*=\s*&([A-Za-z0-9_]+)\s*;/g;

/** Extract every `vwatch_global_vars[N] = &cname;` slot from generated C. */
export function parseGlobalSlots(text: string): VarSlot[] {
  return matchAll(text, GLOBAL_RE);
}

/** Extract every `vwatch_local_vars[N] = &cname;` slot from generated C. */
export function parseLocalSlots(text: string): VarSlot[] {
  return matchAll(text, LOCAL_RE);
}

function matchAll(text: string, re: RegExp): VarSlot[] {
  const out: VarSlot[] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ index: parseInt(m[1], 10), cname: m[2] });
  }
  return out;
}

/**
 * Resolve a global slot (`cname` shaped `__[ARRAY_]<TYPE>_<NAME>`). Returns
 * `null` for a user-defined type we cannot size from the name alone.
 */
export function resolveGlobal(slot: VarSlot): ResolvedVar | null {
  // Global scope prefix is a leading "__" (empty scope between two `_`).
  if (!slot.cname.startsWith("__")) return null;
  return resolveRemainder(slot.index, slot.cname.slice(2));
}

/**
 * Resolve a local slot for the routine whose internal name is `subInternalName`
 * (e.g. `SUB_GREET`), or `null` if the slot belongs to another routine or an
 * unrecognized type.
 */
export function resolveLocal(
  slot: VarSlot,
  subInternalName: string
): ResolvedVar | null {
  const prefix = "_" + subInternalName + "_";
  if (!slot.cname.startsWith(prefix)) return null;
  return resolveRemainder(slot.index, slot.cname.slice(prefix.length));
}

/** Parse `[ARRAY_]<TYPE>_<NAME>` into a {@link ResolvedVar}. */
function resolveRemainder(index: number, remainder: string): ResolvedVar | null {
  let isArray = false;
  if (remainder.startsWith("ARRAY_")) {
    isArray = true;
    remainder = remainder.slice("ARRAY_".length);
  }
  for (const t of TYPE_TOKENS) {
    if (remainder.startsWith(t.token + "_")) {
      const name = remainder.slice(t.token.length + 1);
      if (!name) return null;
      return {
        index,
        name,
        varType: t.varType,
        size: t.size,
        isArray,
      };
    }
  }
  return null; // UDT or unknown type
}

/**
 * Resolve all module-level (global) variables from generated C text.
 */
export function resolveGlobals(text: string): ResolvedVar[] {
  const out: ResolvedVar[] = [];
  for (const slot of parseGlobalSlots(text)) {
    const r = resolveGlobal(slot);
    if (r) out.push(r);
  }
  return out;
}

/**
 * Resolve the local variables that belong to `subInternalName` from generated
 * C text (which may contain several routines' tables).
 */
export function resolveLocals(
  text: string,
  subInternalName: string
): ResolvedVar[] {
  const out: ResolvedVar[] = [];
  for (const slot of parseLocalSlots(text)) {
    const r = resolveLocal(slot, subInternalName);
    if (r) out.push(r);
  }
  return out;
}
