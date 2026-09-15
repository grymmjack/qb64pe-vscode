/**
 * Conditional-breakpoint helpers, kept vscode-free so they can be unit-tested.
 * vwatch has no native "break if"; the debug adapter evaluates the condition on
 * each hit and resumes when it is not met.
 */

/** Evaluate a VS Code hitCondition ("5", ">5", ">=5", "%3", "==5") vs a count. */
export function hitConditionMet(cond: string, hits: number): boolean {
  const m = /^\s*(>=|<=|==|=|>|<|%)?\s*(\d+)\s*$/.exec(cond);
  if (!m) return true; // unparseable → do not suppress the stop
  const n = parseInt(m[2], 10);
  switch (m[1]) {
    case ">":
      return hits > n;
    case ">=":
      return hits >= n;
    case "<":
      return hits < n;
    case "<=":
      return hits <= n;
    case "%":
      return n !== 0 && hits % n === 0;
    default:
      return hits === n; // "=", "==", or a bare number
  }
}

/** Parse a `<var> <op> <literal>` condition, or `null` if unsupported. */
export function parseCondition(
  condition: string
): { name: string; op: string; rhs: string } | null {
  const m = /^\s*([A-Za-z_][A-Za-z0-9_]*[%&!#$~]?)\s*(<=|>=|<>|!=|==|=|<|>)\s*(.+?)\s*$/.exec(
    condition
  );
  if (!m) return null;
  return { name: m[1], op: m[2], rhs: m[3] };
}

/** Compare a decoded value string against a literal per a QB64 relational op. */
export function compareValues(value: string, op: string, rhs: string): boolean {
  const r = rhs.trim();
  const isString = /^".*"$/.test(r);
  let cmp: number;
  if (isString) {
    const lit = r.slice(1, -1);
    cmp = value < lit ? -1 : value > lit ? 1 : 0;
  } else {
    const a = parseFloat(value);
    const b = parseFloat(r);
    if (Number.isNaN(a) || Number.isNaN(b)) {
      cmp = value < r ? -1 : value > r ? 1 : 0;
    } else {
      cmp = a < b ? -1 : a > b ? 1 : 0;
    }
  }
  switch (op) {
    case "<":
      return cmp < 0;
    case ">":
      return cmp > 0;
    case "<=":
      return cmp <= 0;
    case ">=":
      return cmp >= 0;
    case "<>":
    case "!=":
      return cmp !== 0;
    default:
      return cmp === 0; // "=" or "=="
  }
}
