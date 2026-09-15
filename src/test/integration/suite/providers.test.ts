import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

// End-to-end smoke test: every language provider exercised through VS Code's
// own execute*Provider commands against the fixture workspace.
const FIXTURES = path.resolve(__dirname, "../../../../test/fixtures");
const BASICS = path.join(FIXTURES, "basics.bas");
const MAIN = path.join(FIXTURES, "include/main.bas");

async function waitFor(cond: () => boolean, timeoutMs = 3000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (cond()) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return cond();
}

let basics: vscode.TextDocument;
let scratch: vscode.TextDocument;
let scratchPath: string;

function pos(doc: vscode.TextDocument, needle: string, offset = 0): vscode.Position {
  for (let i = 0; i < doc.lineCount; i++) {
    const c = doc.lineAt(i).text.indexOf(needle);
    if (c >= 0) return new vscode.Position(i, c + offset);
  }
  throw new Error(`"${needle}" not found in ${doc.fileName}`);
}
const line = (doc: vscode.TextDocument, needle: string) => pos(doc, needle).line;

describe("QB64PE providers (extension host)", function () {
  before(async () => {
    basics = await vscode.workspace.openTextDocument(BASICS);
    await vscode.window.showTextDocument(basics);
    const ext = vscode.extensions.getExtension("grymmjack.qb64pe")!;
    const api = await ext.activate();
    await api.workspaceIndex.whenReady();

    scratchPath = path.join(os.tmpdir(), `qb64pe-int-${process.pid}.bas`);
    fs.writeFileSync(
      scratchPath,
      ["TYPE Vec2", "    x AS SINGLE", "    y AS SINGLE", "END TYPE", "DIM p AS Vec2", "p.x = 1", "p.", "PRINT p.x", ""].join("\n")
    );
    scratch = await vscode.workspace.openTextDocument(scratchPath);
  });

  after(() => {
    try { fs.unlinkSync(scratchPath); } catch { /* ignore */ }
  });

  it("go to definition", async () => {
    const defs = await vscode.commands.executeCommand<vscode.Location[]>(
      "vscode.executeDefinitionProvider", basics.uri, pos(basics, "PRINT Add(1, 2)", 6));
    assert.strictEqual(defs.length, 1);
    assert.strictEqual(defs[0].range.start.line, line(basics, "FUNCTION Add"));
    assert.strictEqual(defs[0].range.start.character, "FUNCTION ".length);
  });

  it("go to definition across an $INCLUDE", async () => {
    const main = await vscode.workspace.openTextDocument(MAIN);
    const defs = await vscode.commands.executeCommand<vscode.Location[]>(
      "vscode.executeDefinitionProvider", main.uri, pos(main, "DeepValue&"));
    assert.strictEqual(path.basename(defs[0].uri.fsPath), "deep.bm");
    const file = await vscode.commands.executeCommand<vscode.Location[]>(
      "vscode.executeDefinitionProvider", main.uri, pos(main, "'$INCLUDE:'lib.bi'", 12));
    assert.strictEqual(path.basename(file[0].uri.fsPath), "lib.bi");
  });

  it("find references", async () => {
    const refs = await vscode.commands.executeCommand<vscode.Location[]>(
      "vscode.executeReferenceProvider", basics.uri, pos(basics, "SUB InitGame", 4));
    assert.deepStrictEqual(refs.map((r) => r.range.start.line).sort((a, b) => a - b),
      [line(basics, "InitGame"), line(basics, "SUB InitGame")]);
  });

  it("hover", async () => {
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
      "vscode.executeHoverProvider", basics.uri, pos(basics, "PRINT Add(1, 2)", 6));
    const text = (hovers[0].contents[0] as vscode.MarkdownString).value;
    assert.ok(text.includes("FUNCTION Add (a AS INTEGER, b AS INTEGER)"), text);
    assert.ok(text.includes("Adds two integers."), text);
  });

  it("document symbols (outline) with hierarchy", async () => {
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
      "vscode.executeDocumentSymbolProvider", basics.uri);
    const init = symbols.find((s) => s.name === "InitGame")!;
    assert.deepStrictEqual(init.children.map((c) => c.name), ["initialised", "i"]);
    assert.strictEqual(init.range.end.line, line(basics, "END SUB"));
  });

  it("completion lists in-scope user symbols before keywords", async () => {
    const list = await vscode.commands.executeCommand<vscode.CompletionList>(
      "vscode.executeCompletionItemProvider", basics.uri, pos(basics, "PRINT Add(1, 2)", 5));
    const labels = list.items.map((i) => String(i.label));
    assert.ok(labels.includes("InitGame") && labels.includes("PRINT"), labels.slice(0, 20).join());
    const sorted = [...list.items].sort((a, b) => String(a.sortText ?? a.label).localeCompare(String(b.sortText ?? b.label)));
    assert.ok(sorted.findIndex((i) => i.label === "InitGame") < sorted.findIndex((i) => i.label === "PRINT"));
  });

  it("member completion after a dot", async () => {
    const list = await vscode.commands.executeCommand<vscode.CompletionList>(
      "vscode.executeCompletionItemProvider", scratch.uri, new vscode.Position(6, 2), ".");
    assert.deepStrictEqual(list.items.map((i) => String(i.label)), ["x", "y"]);
  });

  it("signature help", async () => {
    const help = await vscode.commands.executeCommand<vscode.SignatureHelp>(
      "vscode.executeSignatureHelpProvider", basics.uri, pos(basics, "PRINT Add(1, 2)", "PRINT Add(1, ".length), "(");
    assert.ok(help.signatures[0].label.startsWith("FUNCTION Add"), help.signatures[0].label);
    assert.strictEqual(help.activeParameter, 1);
  });

  it("rename", async () => {
    const edit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
      "vscode.executeDocumentRenameProvider", scratch.uri, new vscode.Position(4, 4), "player");
    const edits = edit.get(scratch.uri);
    assert.strictEqual(edits.length, 4); // DIM p, p.x =, p., PRINT p.x
    assert.ok(edits.every((e) => e.newText === "player"));
  });

  it("document highlights", async () => {
    const highlights = await vscode.commands.executeCommand<vscode.DocumentHighlight[]>(
      "vscode.executeDocumentHighlights", basics.uri, pos(basics, "X = X + 1"));
    assert.strictEqual(highlights.length, 3);
    assert.strictEqual(highlights.filter((h) => h.kind === vscode.DocumentHighlightKind.Write).length, 2);
  });

  it("workspace symbols", async () => {
    const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
      "vscode.executeWorkspaceSymbolProvider", "DeepVal");
    assert.ok(symbols.some((s) => s.name === "DeepValue&"));
  });

  it("folding ranges", async () => {
    const ranges = await vscode.commands.executeCommand<vscode.FoldingRange[]>(
      "vscode.executeFoldingRangeProvider", basics.uri);
    assert.ok(ranges.some((r) => r.start === line(basics, "SUB InitGame") && r.end === line(basics, "END SUB") - 1));
  });

  it("hover uses live-converted help from the installed QB64PE source", async () => {
    const install = path.resolve(__dirname, "../../../../test/fixtures/qb64pe-install");
    const cfg = vscode.workspace.getConfiguration("qb64pe");
    await cfg.update("installPath", install, vscode.ConfigurationTarget.Global);
    try {
      const kw = path.join(os.tmpdir(), `qb64pe-help-${process.pid}.bas`);
      fs.writeFileSync(kw, "c = _RGB32(255, 0, 0)\n");
      const doc = await vscode.workspace.openTextDocument(kw);
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        "vscode.executeHoverProvider", doc.uri, new vscode.Position(0, 6));
      const text = (hovers[0].contents[0] as vscode.MarkdownString).value;
      assert.ok(text.includes("## [_RGB32]"), "live title header");
      assert.ok(text.includes("#### PARAMETERS"), "converted section");
      assert.ok(text.includes('<span style="color:#'), "coloured output preserved");
      assert.ok(text.includes("<style"), "hover style header prepended");
      assert.ok(!text.includes("{{") && !text.includes("[["), "no raw wiki markup");
      fs.unlinkSync(kw);

      // A keyword the install does not ship falls back to the bundled snapshot.
      const kw2 = path.join(os.tmpdir(), `qb64pe-help2-${process.pid}.bas`);
      fs.writeFileSync(kw2, "LOCATE 1, 1\n");
      const doc2 = await vscode.workspace.openTextDocument(kw2);
      const h2 = await vscode.commands.executeCommand<vscode.Hover[]>(
        "vscode.executeHoverProvider", doc2.uri, new vscode.Position(0, 1));
      assert.ok(h2.length > 0 && (h2[0].contents[0] as vscode.MarkdownString).value.length > 0,
        "bundled fallback still provides LOCATE help");
      fs.unlinkSync(kw2);
    } finally {
      await cfg.update("installPath", undefined, vscode.ConfigurationTarget.Global);
    }
  });

  it("F1 (extension.showHelp) opens the live-converted page", async () => {
    const install = path.resolve(__dirname, "../../../../test/fixtures/qb64pe-install");
    const cfg = vscode.workspace.getConfiguration("qb64pe");
    await cfg.update("installPath", install, vscode.ConfigurationTarget.Global);
    await cfg.update("isOpenHelpInEditModeEnabled", false, vscode.ConfigurationTarget.Global);
    const file = path.join(os.tmpdir(), `qb64pe-f1-${process.pid}.bas`);
    fs.writeFileSync(file, "c = _RGB32(1, 2, 3)\n");
    try {
      const doc = await vscode.workspace.openTextDocument(file);
      const editor = await vscode.window.showTextDocument(doc);
      editor.selection = new vscode.Selection(0, 4, 0, 10); // select "_RGB32"
      await vscode.commands.executeCommand("extension.showHelp");

      const opened = await waitFor(() =>
        vscode.window.tabGroups.all
          .flatMap((g) => g.tabs)
          .some((t) => /RGB32/i.test(t.label))
      );
      assert.ok(opened, "a preview/editor tab for _RGB32 should open");
    } finally {
      await vscode.commands.executeCommand("workbench.action.closeAllEditors");
      await cfg.update("installPath", undefined, vscode.ConfigurationTarget.Global);
      fs.unlinkSync(file);
    }
  });

  it("call hierarchy", async () => {
    const [item] = await vscode.commands.executeCommand<vscode.CallHierarchyItem[]>(
      "vscode.prepareCallHierarchy", basics.uri, pos(basics, "FUNCTION Add", 9));
    assert.strictEqual(item.name, "Add");
    const incoming = await vscode.commands.executeCommand<vscode.CallHierarchyIncomingCall[]>(
      "vscode.provideIncomingCalls", item);
    assert.strictEqual(incoming.length, 1);
    assert.strictEqual(incoming[0].from.name, "basics.bas"); // module-level PRINT Add(1, 2)
    assert.strictEqual(incoming[0].fromRanges[0].start.line, line(basics, "PRINT Add(1, 2)"));
  });

  it("semantic tokens", async () => {
    const tokens = await vscode.commands.executeCommand<vscode.SemanticTokens>(
      "vscode.provideDocumentSemanticTokens", basics.uri);
    assert.ok(tokens && tokens.data.length >= 5 * 10, `got ${tokens?.data.length ?? 0} ints`);
  });
});
