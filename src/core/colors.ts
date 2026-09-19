/**
 * Find QB64PE colour literals for the editor's colour chip / picker
 * (vscode-free, unit-tested).
 *
 * Detects the RGB family (`_RGB`, `_RGB32`, `_RGBA`, `_RGBA32`) and the HSB
 * family (`_HSB`, `_HSB32`, `_HSBA`, `_HSBA32`) when every argument is an
 * integer literal — the only case where a static swatch is meaningful and where
 * rewriting the call from the picker is safe (a call with a variable/expression
 * argument is left untouched). Strings and comments are masked via the lexer so
 * a call inside a string literal is ignored.
 *
 * Channel ranges follow QB64PE (libqb graphics.cpp):
 *   RGB(A):  r,g,b 0..255,  alpha 0..255
 *   HSB(A):  hue 0..360,    sat/bri 0..100,  alpha 0..100 (percent)
 * The HSB<->RGB maths mirrors QB64PE's hsb2rgb/rgb2hsb exactly so the swatch and
 * the round-trip match the compiler.
 */
import { scanLine } from "./lexer";

export type ColorModel = "rgb" | "hsb";

export interface ColorHit {
  /** Offset of the start of the whole call (`_RGB32`). */
  start: number;
  /** Offset just past the closing `)`. */
  end: number;
  /** Original function name, casing preserved. */
  func: string;
  model: ColorModel;
  /** Display channels, 0..255 (HSB is converted to RGB for the swatch). */
  r: number;
  g: number;
  b: number;
  a: number;
  /** Literal argument count in the source call. */
  argCount: number;
}

const CALL_RE = /(?<![A-Za-z0-9_])(_(?:RGBA?|HSBA?)(?:32)?)\s*\(/gi;

export function modelOf(func: string): ColorModel {
  return /^_HSB/i.test(func) ? "hsb" : "rgb";
}

/** Find every rewritable colour literal in `text`. */
export function findColors(text: string): ColorHit[] {
  const hits: ColorHit[] = [];
  const lines = text.split(/\r?\n/);
  let offset = 0;
  for (const line of lines) {
    const mask = scanLine(line).mask; // strings/comments blanked, columns preserved
    CALL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = CALL_RE.exec(mask)) !== null) {
      const open = m.index + m[0].length - 1;
      const close = matchParen(mask, open);
      if (close < 0) continue;
      const parts = mask.slice(open + 1, close).split(",").map((s) => s.trim());
      if (parts.length === 0 || !parts.every((p) => /^\d+$/.test(p))) continue;
      const nums = parts.map((p) => parseInt(p, 10));
      const func = line.slice(m.index, m.index + m[1].length);
      const rgba = toDisplayRgba(modelOf(func), nums);
      if (!rgba) continue;
      hits.push({
        start: offset + m.index,
        end: offset + close + 1,
        func,
        model: modelOf(func),
        r: rgba[0],
        g: rgba[1],
        b: rgba[2],
        a: rgba[3],
        argCount: nums.length,
      });
    }
    offset += line.length + 1; // +1 for the split newline
  }
  return hits;
}

/**
 * Render a colour (given as 0..255 RGBA) back into a QB64PE call, preserving the
 * original function name and, where possible, arity. A non-opaque alpha on a
 * 3-arg call promotes it to 4 args so transparency isn't silently dropped.
 */
export function formatColor(
  func: string,
  argCount: number,
  r: number,
  g: number,
  b: number,
  a: number
): string {
  const wantAlpha = argCount >= 4 || a < 255;
  if (modelOf(func) === "hsb") {
    const [h, s, br] = rgbToHsb(r, g, b);
    return wantAlpha
      ? `${func}(${h}, ${s}, ${br}, ${Math.round((a / 255) * 100)})`
      : `${func}(${h}, ${s}, ${br})`;
  }
  return wantAlpha ? `${func}(${r}, ${g}, ${b}, ${a})` : `${func}(${r}, ${g}, ${b})`;
}

/** Map a call's literal args to display RGBA (0..255), or null if unsupported. */
function toDisplayRgba(model: ColorModel, nums: number[]): [number, number, number, number] | null {
  if (model === "hsb") {
    if (nums.length !== 3 && nums.length !== 4) return null;
    const [r, g, b] = hsbToRgb(nums[0], nums[1], nums[2]);
    const a = nums.length === 4 ? clamp255(Math.round((clamp(nums[3], 0, 100) / 100) * 255)) : 255;
    return [r, g, b, a];
  }
  switch (nums.length) {
    case 1:
      return [clamp255(nums[0]), clamp255(nums[0]), clamp255(nums[0]), 255];
    case 2:
      return [clamp255(nums[0]), clamp255(nums[0]), clamp255(nums[0]), clamp255(nums[1])];
    case 3:
      return [clamp255(nums[0]), clamp255(nums[1]), clamp255(nums[2]), 255];
    case 4:
      return [clamp255(nums[0]), clamp255(nums[1]), clamp255(nums[2]), clamp255(nums[3])];
    default:
      return null;
  }
}

// --- HSB <-> RGB, mirroring QB64PE libqb graphics.cpp -----------------------
// hue 0..360, sat/bri 0..100 (percent) <-> r,g,b 0..255.

export function hsbToRgb(hue: number, sat: number, bri: number): [number, number, number] {
  const h = clamp(hue, 0, 360);
  const s = clamp(sat, 0, 100) / 100;
  const v = clamp(bri, 0, 100) / 100;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = v; // grayscale
  } else {
    let hu = h / 60;
    if (hu >= 6) hu -= 6;
    const hi = Math.floor(hu);
    const hf = hu - hi;
    const pv = v * (1 - s);
    const qv = v * (1 - s * hf);
    const tv = v * (1 - s * (1 - hf));
    switch (hi) {
      case 0: [r, g, b] = [v, tv, pv]; break;
      case 1: [r, g, b] = [qv, v, pv]; break;
      case 2: [r, g, b] = [pv, v, tv]; break;
      case 3: [r, g, b] = [pv, qv, v]; break;
      case 4: [r, g, b] = [tv, pv, v]; break;
      default: [r, g, b] = [v, pv, qv]; break; // case 5
    }
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export function rgbToHsb(r255: number, g255: number, b255: number): [number, number, number] {
  const r = clamp255(r255) / 255;
  const g = clamp255(g255) / 255;
  const b = clamp255(b255) / 255;
  const mini = Math.min(r, g, b);
  const maxi = Math.max(r, g, b);
  const diff = maxi - mini;
  const v = maxi;
  const s = maxi !== 0 ? diff / maxi : 0;
  let h = 0;
  if (s !== 0) {
    let hu: number;
    if (r === maxi) {
      hu = (g - b) / diff;
      if (hu < 0) hu += 6;
    } else if (g === maxi) {
      hu = 2 + (b - r) / diff;
    } else {
      hu = 4 + (r - g) / diff;
    }
    h = hu * 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(v * 100)];
}

function matchParen(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}
function clamp255(n: number): number {
  return clamp(n, 0, 255);
}
