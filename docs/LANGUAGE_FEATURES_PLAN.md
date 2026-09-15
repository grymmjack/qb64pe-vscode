# QB64PE Extension — Language Features Improvement Plan

**Goal:** Bring the extension up to full "language server" capability — accurate go-to-definition,
find-references, rename, rich outline, and real (TypeScript-style) completion — while staying a
single in-process VS Code extension.

**Audience:** the extension maintainer (assumes familiarity with the codebase).

---

## 1. Is this possible? Yes — and no separate language server is needed

VS Code exposes every "language server feature" as an **in-process provider API**
(`vscode.languages.register*Provider`). The extension already uses six of them. The remaining
features (rename, document highlight, workspace symbols, folding, semantic tokens) are added the
same way, in TypeScript, with no `vscode-languageclient`/LSP server process.

A true LSP server is an option but is a much larger rewrite and only pays off when you want to
reuse the engine across multiple editors. **Recommendation: stay in-process.**

> **Key idea:** "LSP feature" ≠ "LSP protocol." The protocol is only a transport so a server
> process can talk to any editor. Inside one VS Code extension you implement the identical
> capabilities directly against the `vscode` API.

The quality of *all* these features comes from one thing: an accurate symbol model. Get the index
right and definition / references / rename / outline / completion all fall out of it.

---

## 2. Current state (assessment)

There is already a good symbol model — `QB64Symbol` + `SymbolParser`
(`src/providers/SymbolParser.ts`): scopes (LOCAL/MODULE/GLOBAL), parameters, doc-comments,
`$INCLUDE` following, and mtime caching. **But it is used by only three providers** (completion,
hover, signature help). The others each reinvent their own scanner, inconsistently:

| Provider | Today | Problem |
|---|---|---|
| `DefinitionProvider.ts` | own line-grep for `sub/dim/function/type/const` | returns the first *line containing* the word, not the real definition; **mutates the editor** (opens doc, moves cursor) mid-request — an anti-pattern; ignores scope |
| `ReferenceProvider.ts` | naive `\bword\b` text match | matches inside comments/strings; **never recurses into includes** (its own TODO); no definition-vs-use distinction |
| `DocumentSymbolProvider.ts` | third independent scanner; also fills the global `symbolCache` | flat outline (locals/params not nested under their SUB); tangled with the TODO-tree refresh |
| `CompletionItemProvider.ts` | uses `SymbolParser` **and** a redundant legacy `getLocalCompletions` regex scanner | no member completion (`var.field`); returns the full array every keystroke (no `CompletionList`/`isIncomplete`); dead duplicate code |

So "make it better" is really **one architectural move plus feature work on top**: promote the
parser to a single workspace-wide **symbol index**, then make every provider consume it.

### QB64-specific challenges the index must handle
- **Case-insensitive** identifiers (normalize case in the index key).
- **Sigil-typed names** (`x$`, `n%`, `p&`, `d#`) — treat the sigil as part of identity.
- **Optional `DIM`** — variables can appear on first assignment.
- **`$INCLUDE`** textual inclusion — the include graph is part of scope resolution.
- Multi-statement lines with `:`, line continuations `_`, single-line `IF` — parser edge cases.

---

## 3. Phased plan

### Phase 0 — Unify on a single symbol index *(foundation; everything depends on it)*
- Evolve `SymbolParser` into a `SymbolIndex`: workspace-wide map, incremental updates on
  save/create/delete/rename, and an explicit **include graph** (a change in a `.bi` invalidates
  dependents).
- Add reverse lookups: `findDefinition(name, scope)` and `findReferences(name)`.
- Add position→token resolution that **skips comments and strings** (extend
  `getQB64WordFromDocument`) so every provider agrees on "what symbol is under the cursor."
- Delete the duplicate scanners in Definition / Reference / DocumentSymbol / `getLocalCompletions`.

### Phase 1 — Go-to-definition & find-references (make them correct)
- **Definition:** resolve the token via the index, honor scope (local var in this SUB vs a
  module/global), return `Location[]` and **let VS Code navigate** (remove the manual
  `showTextDocument`/selection mutation). Handles SUB/FUNCTION/TYPE/CONST/DIM/labels and
  `$INCLUDE` file jumps (keep the existing include-jump logic — it works).
- **References:** walk the include graph, match whole-word **excluding comments/strings**, include
  the declaration, support "peek references." Respect `ReferenceContext.includeDeclaration`.

### Phase 2 — Richer outline
- Rebuild `DocumentSymbolProvider` on the index with real **hierarchy**: SUB/FUNCTION nodes
  contain their params and local DIMs; TYPE contains its fields (already partly done); labels
  grouped. Use correct ranges (full body, not just the header line) so the outline highlights as
  the cursor moves.
- Move the TODO-tree refresh out of the symbol provider into its own document listener.

### Phase 3 — "Real" completion (TypeScript-style)
- **Member completion:** detect `identifier.` before the cursor, resolve the identifier's TYPE via
  the index, and offer that TYPE's fields. This is the single biggest "feels like TS" win.
- Return a `CompletionList` with `isIncomplete` and let the index cache do the heavy lifting; drop
  the legacy `getLocalCompletions`.
- Keep keywords, but rank in-scope user symbols first (kind-priority sort already exists). Wire
  `resolveCompletionItem` to lazily attach docs/signatures (cheaper per keystroke).

### Phase 4 — New LSP features (all in-process)
- **Rename** (`RenameProvider` + `prepareRename`): safe, scope-aware rename across the include
  graph — reuses the Phase 1 references engine.
- **Document highlights** (`DocumentHighlightProvider`): highlight all occurrences of the symbol
  under the cursor.
- **Workspace symbols** (`WorkspaceSymbolProvider`): `Ctrl+T` jump to any SUB/FUNCTION/TYPE/CONST
  across the project.
- **Folding** (`FoldingRangeProvider`): fold SUB/FUNCTION/TYPE/IF/SELECT/DO/FOR blocks (better than
  indentation-based).
- **Semantic tokens** (`DocumentSemanticTokensProvider`): color user-defined subs/functions/types/
  vars distinctly from keywords.

### Phase 5 — Optional / stretch
- Lightweight diagnostics from the index (undefined SUB/FUNCTION call, duplicate definition,
  unused local) — complements the compiler lint without needing to compile.
- Call hierarchy.

> **Reuse insight:** Rename, references, and document-highlight are the *same query* ("all
> occurrences of this symbol") with different presentations. Build the reference engine once in
> Phase 1 and Phase 4 becomes cheap.

---

## 4. Effort & risk

- **Phase 0–1:** the bulk of the value; moderate effort, low risk (the model already exists).
- **Phase 2–3:** moderate; member completion needs TYPE-field resolution but that data is already
  parsed.
- **Phase 4:** mostly small, additive providers once the index exists.
- **Biggest correctness risk:** the regex-based parser on edge cases (multi-statement `:` lines,
  line continuations `_`, single-line `IF`). Mitigate with a small set of fixture `.bas`/`.bi`
  files to test the index against.

---

## 5. Registration checklist (extension.ts)

New providers to register in `activate()` as phases land:

- [ ] `registerRenameProvider`
- [ ] `registerDocumentHighlightProvider`
- [ ] `registerWorkspaceSymbolProvider`
- [ ] `registerFoldingRangeProvider`
- [ ] `registerDocumentSemanticTokensProvider` (+ a `SemanticTokensLegend`)

Existing providers to refactor onto the index: `DefinitionProvider`, `ReferenceProvider`,
`DocumentSymbolProvider`, `CompletionItemProvider` (remove `getLocalCompletions`).
