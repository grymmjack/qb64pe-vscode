/**
 * Flatten a QB64PE program's `$INCLUDE` graph into a single source, with a line
 * map back to the original files.
 *
 * QB64PE only emits per-line debug instrumentation for the *main module*, so
 * code inside `$INCLUDE`d `.bi`/`.bm` files is never breakpointable as-is.
 * `$INCLUDE` is textual inclusion, so if we expand every include inline before
 * compiling, the whole program becomes one main module and the compiler
 * instruments all of it. We keep a `origins` array — one entry per flattened
 * line — so the debugger can translate a stop on a flattened line back to the
 * real `(file, line)`, and breakpoints the other way.
 *
 * This module is vscode-free and unit-tested; file reading and include
 * resolution are injected.
 */
import { fileDirectiveAt } from "./parser";

export interface LineOrigin {
  /** Absolute (resolved) path of the file this flattened line came from. */
  file: string;
  /** 1-based line number within that file. */
  line: number;
}

export interface FlattenResult {
  /** The flattened source text. */
  text: string;
  /** `origins[i]` is the origin of flattened line `i + 1` (1-based lines). */
  origins: LineOrigin[];
}

export interface FlattenIO {
  /** Read a file's text, or null if unreadable. */
  readFile: (absPath: string) => string | null;
  /** Resolve an `$INCLUDE` spec relative to the including file (abs path or null). */
  resolve: (spec: string, fromFile: string) => string | null;
}

const INCLUDEONCE_RE = /^\s*\$INCLUDEONCE\b/i;

/**
 * Flatten `entryFile` and everything it includes. Files that declare
 * `$INCLUDEONCE` are inlined at most once; include cycles are broken.
 */
export function flatten(entryFile: string, io: FlattenIO): FlattenResult {
  const out: string[] = [];
  const origins: LineOrigin[] = [];
  const onceIncluded = new Set<string>(); // files with $INCLUDEONCE already inlined
  const stack = new Set<string>(); // files currently being expanded (cycle guard)

  const emit = (file: string, line: number, text: string) => {
    out.push(text);
    origins.push({ file, line });
  };

  const process = (absFile: string): void => {
    if (stack.has(absFile)) return; // include cycle
    const content = io.readFile(absFile);
    if (content === null) return;

    const lines = content.split(/\r?\n/);
    if (lines.some((l) => INCLUDEONCE_RE.test(l))) {
      if (onceIncluded.has(absFile)) return;
      onceIncluded.add(absFile);
    }

    stack.add(absFile);
    lines.forEach((raw, i) => {
      const lineNo = i + 1;
      const directive = fileDirectiveAt(raw);
      if (directive && directive.kind === "INCLUDE") {
        // Neutralize the directive (never emit it verbatim, or the compiler
        // would expand it again), then inline the target in its place.
        emit(absFile, lineNo, "' [flattened $INCLUDE] " + directive.path);
        const target = io.resolve(directive.path, absFile);
        if (target) {
          process(target);
        } else {
          emit(absFile, lineNo, "' [missing $INCLUDE: " + directive.path + "]");
        }
        return;
      }
      emit(absFile, lineNo, raw);
    });
    stack.delete(absFile);
  };

  process(entryFile);
  return { text: out.join("\n"), origins };
}

/**
 * Build a reverse map from the origins: `fileKey -> (originalLine -> flatLine)`.
 * The first flattened occurrence of a line wins (a file included twice maps to
 * its first inlining). `keyOf` normalizes a path to match how origins are keyed.
 */
export function buildReverseMap(
  origins: LineOrigin[],
  keyOf: (file: string) => string
): Map<string, Map<number, number>> {
  const map = new Map<string, Map<number, number>>();
  origins.forEach((origin, i) => {
    const flatLine = i + 1;
    const key = keyOf(origin.file);
    let byLine = map.get(key);
    if (!byLine) {
      byLine = new Map();
      map.set(key, byLine);
    }
    if (!byLine.has(origin.line)) byLine.set(origin.line, flatLine);
  });
  return map;
}
