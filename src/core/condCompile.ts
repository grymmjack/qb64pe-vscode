/**
 * Conditional-compilation branch tracking (vscode-free).
 *
 * QB64PE's `$IF cond THEN / $ELSEIF cond THEN / $ELSE / $END IF` metacommands
 * are precompiler conditionals: at most one branch of a construct is compiled.
 * So a name defined once in each branch (e.g. a per-OS `CONST`) is NOT a real
 * duplicate — the branches never coexist.
 *
 * `branchPaths(lines)` assigns every line a "branch path": for each enclosing
 * `$IF` construct, which branch (0-based) the line sits in. Two lines are
 * mutually exclusive (`condExclusive`) when they share an enclosing construct
 * but live in *different* branches of it — meaning they can never both be
 * compiled. Lines outside any construct, or nested differently, still coexist.
 */

// Metacommands may be written bare (`$IF`) or comment-style (`'$IF`), and may be
// indented. `$ELSE` deliberately does not match `$ELSEIF` (no word boundary
// between "ELSE" and "IF"), but we test `$ELSEIF` first regardless.
const RE_IF = /^\s*'?\$IF\b/i;
const RE_ELSEIF = /^\s*'?\$ELSEIF\b/i;
const RE_ELSE = /^\s*'?\$ELSE\b/i;
const RE_ENDIF = /^\s*'?\$END\s*IF\b/i;

/** A line's branch path: construct id (the `$IF`'s line) -> branch index. */
export type BranchPath = Map<number, number>;

/**
 * For each line index, the set of `$IF` constructs enclosing it and which
 * branch it is in. Unbalanced metacommands are tolerated (a stray `$END IF`
 * with no open construct is ignored), so a half-typed buffer never throws.
 */
export function branchPaths(lines: string[]): BranchPath[] {
  const result: BranchPath[] = new Array(lines.length);
  const stack: { id: number; branch: number }[] = [];
  const snapshot = (): BranchPath => new Map(stack.map((f) => [f.id, f.branch]));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (RE_IF.test(line)) {
      stack.push({ id: i, branch: 0 });
    } else if (RE_ELSEIF.test(line) || RE_ELSE.test(line)) {
      if (stack.length) stack[stack.length - 1].branch++;
    } else if (RE_ENDIF.test(line)) {
      stack.pop();
    }
    result[i] = snapshot();
  }
  return result;
}

/**
 * True when two branch paths can never both be compiled: they share an
 * enclosing `$IF` construct but sit in different branches of it.
 */
export function condExclusive(a: BranchPath, b: BranchPath): boolean {
  for (const [id, branch] of a) {
    const other = b.get(id);
    if (other !== undefined && other !== branch) return true;
  }
  return false;
}
