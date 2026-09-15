import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import {
  displayTitle,
  helpLinkTarget,
  wikiUrl,
  wikitextToMarkdown,
} from "../../core/wikitext";
import { helpKeys, keywordFromHelpFileName, lookupVariants } from "../../core/helpFiles";

const HELP = path.resolve(__dirname, "../../../test/fixtures/help");
const read = (name: string) => fs.readFileSync(path.join(HELP, name), "utf8");
const convert = (name: string, title: string) =>
  wikitextToMarkdown(read(name), { title });

describe("core/wikitext", () => {
  describe("helpers", () => {
    it("builds link targets and wiki urls, keeping sigils, stripping prefixes", () => {
      assert.strictEqual(helpLinkTarget("_RGB32"), "RGB32.md");
      assert.strictEqual(helpLinkTarget("MID$"), "MID$.md");
      assert.strictEqual(helpLinkTarget("PRINT USING"), "PRINT_USING.md");
      assert.strictEqual(helpLinkTarget("SCREEN (function)"), "SCREEN_(function).md");
      assert.strictEqual(wikiUrl("PRINT USING"), "https://qb64phoenix.com/qb64wiki/index.php/PRINT_USING");
    });
    it("reads DISPLAYTITLE when present", () => {
      assert.strictEqual(displayTitle("{{DISPLAYTITLE:_RGB32}}\nx"), "_RGB32");
      assert.strictEqual(displayTitle("The [[PRINT]] ..."), null);
    });
  });

  describe("_RGB32 (function page)", () => {
    const md = convert("_RGB32.txt", "_RGB32");
    it("has the title header and wiki link", () => {
      assert.ok(md.startsWith("## [_RGB32](RGB32.md) [📖](https://qb64phoenix.com/qb64wiki/index.php/_RGB32)\n---"));
    });
    it("renders the summary and section headings", () => {
      assert.ok(md.includes("### The *RGB32* function returns") || md.includes("### The "));
      for (const h of ["#### SYNTAX", "#### PARAMETERS", "#### DESCRIPTION", "#### EXAMPLES"]) {
        assert.ok(md.includes(h), `missing ${h}`);
      }
    });
    it("keeps type sigils unescaped and links keywords", () => {
      assert.ok(!md.includes("\\$"), "should not backslash-escape $");
      assert.ok(md.includes("[LONG](LONG.md)"), "keyword links");
      assert.ok(md.includes("*red&*"), "parameters italicised");
    });
    it("renders code as a fenced block with links flattened to text", () => {
      assert.ok(md.includes("```vb"));
      assert.ok(md.includes("SCREEN 12"), "Cl link became plain code");
      assert.ok(!/```vb[\s\S]*\{\{/.test(md), "no templates left inside code");
    });
    it("renders coloured OUTPUT as <pre> with colour spans", () => {
      assert.ok(md.includes("<pre>"));
      assert.ok(/<span style="color:#[0-9a-fA-F]{6}">COLOR 1 = &amp;HFF0000A8<\/span>/.test(md), md.slice(md.indexOf("<pre>"), md.indexOf("<pre>") + 200));
    });
    it("leaves no unconverted wiki markup", () => {
      assert.ok(!md.includes("{{"), "no templates remain");
      assert.ok(!md.includes("[["), "no wiki links remain");
      assert.ok(!md.includes("'''") && !md.includes("''"), "no bold/italic markers remain");
    });
  });

  describe("PRINT (statement, no DISPLAYTITLE)", () => {
    const md = convert("PRINT.txt", "PRINT");
    it("uses the provided title and renders See Also, dropping Navigation", () => {
      assert.ok(md.startsWith("## [PRINT](PRINT.md)"));
      assert.ok(md.includes("#### SEE ALSO"));
      assert.ok(md.includes("[VIEW PRINT](VIEW_PRINT.md)"));
      assert.ok(!md.includes("NAVIGATION"));
    });
    it("renders nested lists with indentation", () => {
      assert.ok(/\n  \* /.test(md), "second-level list items indented");
    });
    it("renders inline coloured text from an output block", () => {
      assert.ok(md.includes('<span style="color:#ff1515">Start red</span>'));
    });
  });

  describe("$CONSOLE (metacommand, sigil title)", () => {
    const md = convert("$CONSOLE.txt", "$CONSOLE");
    it("keeps the $ in the title, link target and body", () => {
      assert.ok(md.startsWith("## [$CONSOLE]($CONSOLE.md)"));
      assert.ok(md.includes("[_CONSOLE](CONSOLE.md)"));
    });
    it("flattens {{Cm|$CONSOLE}} and protects <nowiki> strings in code", () => {
      assert.ok(md.includes("$CONSOLE\n") || md.includes("$CONSOLE"));
      assert.ok(md.includes('PRINT "Close this console window'), "nowiki string kept literally");
      assert.ok(!md.includes("<nowiki>"));
    });
  });
});

describe("core/helpFiles", () => {
  it("decodes shipped help filenames to their keyword", () => {
    assert.strictEqual(keywordFromHelpFileName("_RGB32__11132.txt"), "_RGB32");
    assert.strictEqual(keywordFromHelpFileName("LEN_111.txt"), "LEN");
    assert.strictEqual(keywordFromHelpFileName("%24CONSOLE_%241111111.txt"), "$CONSOLE");
    assert.strictEqual(keywordFromHelpFileName("MID%24_111%24.txt"), "MID$");
    assert.strictEqual(keywordFromHelpFileName("PRINT_USING_11111_11111.txt"), "PRINT_USING");
    assert.strictEqual(keywordFromHelpFileName("_INTEGER64__111111164.txt"), "_INTEGER64");
  });
  it("returns null for non-conforming names", () => {
    assert.strictEqual(keywordFromHelpFileName("links.bin"), null);
    assert.strictEqual(keywordFromHelpFileName("evenlength_11.txt"), null); // even → not name+_+mask
  });
  it("produces case-insensitive lookup keys and variants", () => {
    assert.deepStrictEqual(helpKeys("_RGB32").sort(), ["_RGB32", "RGB32"].sort());
    assert.deepStrictEqual(helpKeys("PRINT_USING").sort(), ["PRINT USING", "PRINT_USING"].sort());
    assert.ok(lookupVariants("rgb32").includes("_RGB32"));
    assert.ok(lookupVariants("count%").includes("COUNT"));
    assert.ok(lookupVariants("console").includes("$CONSOLE"));
  });
});
