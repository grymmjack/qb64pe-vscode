import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { parseContent } from "../../core/parser";

// Robustness sweep over the real QB64PE compiler sources and its compile tests
// (~600 .bas/.bi/.bm files). It only asserts that parsing never throws and
// yields symbols overall - it is a crash/hang detector, not an oracle.
//
// Skipped when the corpus is not present. Point QB64PE_SRC at a checkout of
// https://github.com/QB64-Phoenix-Edition/QB64pe to enable it; by default a
// sibling `../qb64pe` directory is used.
const REPO_ROOT = path.resolve(__dirname, "../../..");
const CORPUS = process.env.QB64PE_SRC || path.resolve(REPO_ROOT, "../qb64pe");

function listSources(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // internal/temp* are compiler scratch dirs, not source
      if (/^temp/.test(entry.name) || entry.name === ".git") continue;
      listSources(full, out);
    } else if (/\.(bas|bi|bm)$/i.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe("QB64PE source corpus", function () {
  this.timeout(60000);

  const available = fs.existsSync(path.join(CORPUS, "source"));
  const run = available ? it : it.skip;

  run(`parses every .bas/.bi/.bm under ${CORPUS} without throwing`, () => {
    const files = listSources(CORPUS);
    assert.ok(files.length > 100, `expected a real corpus, found ${files.length} files`);

    let total = 0;
    const failures: string[] = [];
    for (const file of files) {
      try {
        const symbols = parseContent(fs.readFileSync(file, "utf8"), file);
        total += symbols.length;
      } catch (error) {
        failures.push(`${path.relative(CORPUS, file)}: ${error}`);
      }
    }

    assert.deepStrictEqual(failures, []);
    assert.ok(total > 1000, `expected thousands of symbols, got ${total}`);
  });
});
