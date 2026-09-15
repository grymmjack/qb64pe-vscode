/**
 * Workspace-wide symbol index (vscode-free).
 *
 * Holds the parsed symbols of every known file plus the `$INCLUDE` graph
 * between them, and keeps both current as files are added, changed, removed
 * or renamed. All I/O is injected: an IncludeResolver turns the text of an
 * `$INCLUDE` directive into a file path, and an optional loader supplies the
 * content of resolved includes that are not indexed yet (e.g. a `.bi` that
 * lives outside the workspace). The VS Code adapter wires these to the real
 * workspace; tests wire them to fixtures.
 *
 * Graph vocabulary:
 *  - `includesOf(f)`   files f includes directly
 *  - `includedByOf(f)` files that include f directly
 *  - `closure(f)`      f plus everything it includes, transitively: what is
 *                      textually visible from f
 *  - `rootsOf(f)`      the top-level programs f belongs to (files nobody includes)
 *  - `unitOf(f)`       the union of the closures of f's roots: every file that
 *                      is compiled into the same program(s) as f
 */
import * as fs from "fs";
import * as path from "path";
import { QB64Symbol } from "./symbols";
import { IncludeDirective, parseFile, stripSigil } from "./parser";

export type IncludeResolver = (
  fromFile: string,
  includePath: string
) => string | null;

export type FileLoader = (file: string) => string | null;

export interface IndexedFile {
  path: string;
  symbols: QB64Symbol[];
  /** Raw `$INCLUDE` directives in source order. */
  includes: IncludeDirective[];
  /** Parallel to `includes`: the resolved, normalized path or null. */
  resolved: (string | null)[];
}

/** Canonical key for a file path (absolute; case-folded on Windows). */
export function normalizePath(file: string): string {
  const resolved = path.resolve(file);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

/** Canonical key for a symbol name: case-insensitive, sigil kept. */
export function normalizeName(name: string): string {
  return name.toLowerCase();
}

/** Canonical key ignoring the type sigil: `Add%` and `Add` collide. */
export function normalizeBase(name: string): string {
  return stripSigil(name).toLowerCase();
}

export function isQB64File(file: string): boolean {
  return /\.(bas|bi|bm|inc)$/i.test(file);
}

/**
 * Resolves `$INCLUDE` paths the way QB64PE does: relative to the including
 * file first, then relative to each of the given roots.
 */
export function createIncludeResolver(
  roots: string[],
  exists: (file: string) => boolean = fs.existsSync
): IncludeResolver {
  return (fromFile, includePath) => {
    const include = includePath.replace(/\\/g, "/").trim();
    if (!include) return null;
    const candidates = path.isAbsolute(include)
      ? [include]
      : [
          path.resolve(path.dirname(fromFile), include),
          ...roots.map((root) => path.resolve(root, include)),
        ];
    for (const candidate of candidates) {
      if (exists(candidate)) return normalizePath(candidate);
    }
    return null;
  };
}

/** Reads a file from disk as UTF-8, or null if that fails. */
export const diskLoader: FileLoader = (file) => {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
};

export class SymbolIndex {
  private readonly files = new Map<string, IndexedFile>();
  private readonly includedBy = new Map<string, Set<string>>();
  private readonly byName = new Map<string, QB64Symbol[]>();
  private readonly byBase = new Map<string, QB64Symbol[]>();
  /** Files with at least one `$INCLUDE` that did not resolve. */
  private readonly unresolvedFiles = new Set<string>();

  constructor(
    private readonly resolveInclude: IncludeResolver,
    private readonly loader?: FileLoader
  ) {}

  // ---- mutation ----------------------------------------------------------

  /** Parses `content` as `file`. Returns true when the file was new. */
  setFile(file: string, content: string): boolean {
    const key = normalizePath(file);
    const isNew = !this.files.has(key);
    this.store(key, content);
    this.relink(key);
    if (isNew) this.relinkUnresolved();
    return isNew;
  }

  /** Bulk load: index everything first, then link once. */
  loadMany(entries: Iterable<[string, string]>): void {
    const keys: string[] = [];
    for (const [file, content] of entries) {
      const key = normalizePath(file);
      this.store(key, content);
      keys.push(key);
    }
    for (const key of keys) this.relink(key);
    this.relinkUnresolved();
  }

  removeFile(file: string): boolean {
    const key = normalizePath(file);
    const entry = this.files.get(key);
    if (!entry) return false;

    const dependents = Array.from(this.includedBy.get(key) ?? []);
    this.unlink(key);
    this.unindexSymbols(key);
    this.files.delete(key);
    this.unresolvedFiles.delete(key);
    this.includedBy.delete(key);
    for (const dependent of dependents) this.relink(dependent);
    return true;
  }

  renameFile(oldFile: string, newFile: string, content: string): void {
    this.removeFile(oldFile);
    this.setFile(newFile, content);
  }

  clear(): void {
    this.files.clear();
    this.includedBy.clear();
    this.byName.clear();
    this.byBase.clear();
    this.unresolvedFiles.clear();
  }

  // ---- files -------------------------------------------------------------

  get size(): number {
    return this.files.size;
  }

  has(file: string): boolean {
    return this.files.has(normalizePath(file));
  }

  get(file: string): IndexedFile | undefined {
    return this.files.get(normalizePath(file));
  }

  paths(): string[] {
    return Array.from(this.files.keys());
  }

  symbolsOf(file: string): QB64Symbol[] {
    return this.files.get(normalizePath(file))?.symbols ?? [];
  }

  allSymbols(): QB64Symbol[] {
    const all: QB64Symbol[] = [];
    for (const entry of this.files.values()) all.push(...entry.symbols);
    return all;
  }

  // ---- names -------------------------------------------------------------

  /** Symbols named `name` (case-insensitive, sigil significant). */
  lookup(name: string, within?: Iterable<string>): QB64Symbol[] {
    return this.restrict(this.byName.get(normalizeName(name)) ?? [], within);
  }

  /** Symbols named `name` ignoring the type sigil (`Add` finds `Add%`). */
  lookupBase(name: string, within?: Iterable<string>): QB64Symbol[] {
    return this.restrict(this.byBase.get(normalizeBase(name)) ?? [], within);
  }

  // ---- include graph -----------------------------------------------------

  includesOf(file: string): string[] {
    const entry = this.files.get(normalizePath(file));
    if (!entry) return [];
    return unique(entry.resolved.filter((r): r is string => r !== null));
  }

  unresolvedIncludesOf(file: string): IncludeDirective[] {
    const entry = this.files.get(normalizePath(file));
    if (!entry) return [];
    return entry.includes.filter((_, i) => entry.resolved[i] === null);
  }

  includedByOf(file: string): string[] {
    return Array.from(this.includedBy.get(normalizePath(file)) ?? []);
  }

  closure(file: string): string[] {
    const start = normalizePath(file);
    const seen = new Set<string>([start]);
    const queue = [start];
    for (let q = 0; q < queue.length; q++) {
      for (const inc of this.includesOf(queue[q])) {
        if (this.files.has(inc) && !seen.has(inc)) {
          seen.add(inc);
          queue.push(inc);
        }
      }
    }
    return Array.from(seen);
  }

  rootsOf(file: string): string[] {
    const start = normalizePath(file);
    const seen = new Set<string>([start]);
    const queue = [start];
    const roots: string[] = [];
    for (let q = 0; q < queue.length; q++) {
      const current = queue[q];
      const parents = this.includedByOf(current);
      if (parents.length === 0) {
        roots.push(current);
        continue;
      }
      for (const parent of parents) {
        if (!seen.has(parent)) {
          seen.add(parent);
          queue.push(parent);
        }
      }
    }
    return roots.length > 0 ? roots : [start];
  }

  unitOf(file: string): string[] {
    const start = normalizePath(file);
    const seen = new Set<string>([start]);
    for (const root of this.rootsOf(start)) {
      for (const member of this.closure(root)) seen.add(member);
    }
    return Array.from(seen);
  }

  // ---- internals ---------------------------------------------------------

  private store(key: string, content: string): void {
    if (this.files.has(key)) {
      this.unlink(key); // drop the old entry's edges before it is replaced
      this.unindexSymbols(key);
    }
    const parsed = parseFile(content, key);
    const entry: IndexedFile = {
      path: key,
      symbols: parsed.symbols,
      includes: parsed.includes,
      resolved: [],
    };
    this.files.set(key, entry);
    this.indexSymbols(entry);
  }

  private indexSymbols(entry: IndexedFile): void {
    for (const symbol of entry.symbols) {
      push(this.byName, normalizeName(symbol.name), symbol);
      push(this.byBase, normalizeBase(symbol.name), symbol);
    }
  }

  private unindexSymbols(key: string): void {
    for (const map of [this.byName, this.byBase]) {
      for (const [name, symbols] of map) {
        const kept = symbols.filter((s) => s.file !== key);
        if (kept.length === 0) map.delete(name);
        else if (kept.length !== symbols.length) map.set(name, kept);
      }
    }
  }

  /** Drops `key`'s outgoing include edges. */
  private unlink(key: string): void {
    const entry = this.files.get(key);
    if (!entry) return;
    for (const target of entry.resolved) {
      if (target) this.includedBy.get(target)?.delete(key);
    }
    entry.resolved = [];
  }

  /** Recomputes `key`'s include edges, loading unindexed targets if possible. */
  private relink(key: string): void {
    const entry = this.files.get(key);
    if (!entry) return;
    this.unlink(key);

    let unresolved = false;
    entry.resolved = entry.includes.map((directive) => {
      const target = this.resolveInclude(key, directive.path);
      if (!target) {
        unresolved = true;
        return null;
      }
      if (!this.includedBy.has(target)) this.includedBy.set(target, new Set());
      this.includedBy.get(target)!.add(key);
      if (!this.files.has(target) && this.loader) {
        const content = this.loader(target);
        if (content !== null) this.setFile(target, content);
      }
      return target;
    });

    if (unresolved) this.unresolvedFiles.add(key);
    else this.unresolvedFiles.delete(key);
  }

  private relinkUnresolved(): void {
    for (const key of Array.from(this.unresolvedFiles)) this.relink(key);
  }

  private restrict(
    symbols: QB64Symbol[],
    within?: Iterable<string>
  ): QB64Symbol[] {
    if (!within) return symbols;
    const allowed = new Set(Array.from(within, normalizePath));
    return symbols.filter((s) => allowed.has(s.file));
  }
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
