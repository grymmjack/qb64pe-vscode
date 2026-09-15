/**
 * QB64PE ships help pages as MediaWiki source under `<install>/internal/help/`
 * with mangled filenames: URL-encoded, the decoded form being
 * `name + "_" + mask` in equal halves (mask mirrors the name's character
 * classes). So the keyword is simply the first half of the URL-decoded name.
 * Verified against all 602 shipped pages (every one carrying a DISPLAYTITLE
 * decodes to exactly that title). vscode-free.
 */

/** Decodes a help filename to its keyword, or null if it isn't the expected shape. */
export function keywordFromHelpFileName(fileName: string): string | null {
  const base = fileName.replace(/\.txt$/i, "");
  let decoded: string;
  try {
    decoded = decodeURIComponent(base);
  } catch {
    return null;
  }
  // decoded == name + "_" + mask, len(name) == len(mask) → total length is odd.
  if (decoded.length % 2 === 0) return null;
  const half = (decoded.length - 1) / 2;
  if (decoded[half] !== "_") return null;
  const name = decoded.slice(0, half);
  return name.length > 0 ? name : null;
}

/**
 * Lookup keys for a keyword, so a hover on any spelling finds the page:
 * the name itself, with `_` as space (multi-word pages), and stripped of a
 * leading underscore. All upper-cased for case-insensitive matching.
 */
export function helpKeys(name: string): string[] {
  const keys = new Set<string>();
  const add = (k: string) => {
    const key = k.trim().toUpperCase();
    if (key) keys.add(key);
  };
  add(name);
  add(name.replace(/_/g, " "));
  add(name.replace(/^_/, ""));
  add(name.replace(/^_/, "").replace(/_/g, " "));
  return [...keys];
}

/** Spellings of a hovered token to look up, most specific first. */
export function lookupVariants(token: string): string[] {
  const t = token.trim();
  const out = new Set<string>();
  const add = (k: string) => {
    if (k) out.add(k.toUpperCase());
  };
  add(t);
  add("_" + t); // modern QB64PE functions
  add(t.replace(/^_/, ""));
  add("$" + t); // metacommands
  add(t.replace(/[$%&!#`]+$/, "")); // drop a type sigil
  return [...out];
}
