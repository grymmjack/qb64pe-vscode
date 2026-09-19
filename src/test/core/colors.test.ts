import * as assert from "assert";
import { findColors, formatColor, hsbToRgb, rgbToHsb } from "../../core/colors";

describe("core/colors", () => {
  it("finds _RGB32 calls with literal args", () => {
    const hits = findColors("COLOR _RGB32(0, 255, 0)");
    assert.strictEqual(hits.length, 1);
    const h = hits[0];
    assert.deepStrictEqual([h.r, h.g, h.b, h.a], [0, 255, 0, 255]);
    assert.strictEqual(h.func, "_RGB32");
    assert.strictEqual(h.model, "rgb");
    // range covers the whole call
    assert.strictEqual("COLOR _RGB32(0, 255, 0)".slice(h.start, h.end), "_RGB32(0, 255, 0)");
  });

  it("handles the 4-arg (alpha), gray, and gray+alpha RGB forms", () => {
    assert.deepStrictEqual(findColors("x = _RGBA32(10, 20, 30, 128)")[0].a, 128);
    const gray = findColors("x = _RGB32(200)")[0];
    assert.deepStrictEqual([gray.r, gray.g, gray.b], [200, 200, 200]);
    assert.strictEqual(findColors("x = _RGB32(200, 128)")[0].a, 128);
  });

  it("ignores calls with variable/expression args and calls inside strings", () => {
    assert.deepStrictEqual(findColors("c = _RGB32(r, g, b)"), []);
    assert.deepStrictEqual(findColors('PRINT "_RGB32(0, 255, 0)"'), []);
    assert.deepStrictEqual(findColors("c = _RGB32(x + 1, 0, 0)"), []);
  });

  it("finds multiple colours across lines with correct offsets", () => {
    const text = "a = _RGB32(255, 0, 0)\nb = _RGB32(0, 0, 255)";
    const hits = findColors(text);
    assert.strictEqual(hits.length, 2);
    assert.strictEqual(text.slice(hits[1].start, hits[1].end), "_RGB32(0, 0, 255)");
  });

  it("converts HSB args to an RGB swatch using QB64's ranges (H0-360 S/B0-100)", () => {
    // _HSB32(120, 100, 100) is pure green.
    const h = findColors("COLOR _HSB32(120, 100, 100)")[0];
    assert.strictEqual(h.model, "hsb");
    assert.deepStrictEqual([h.r, h.g, h.b], [0, 255, 0]);
    // HSBA alpha is a 0..100 percent -> 0..255.
    assert.strictEqual(findColors("x = _HSBA32(0, 100, 100, 50)")[0].a, Math.round(0.5 * 255));
  });

  it("round-trips HSB and RGB conversions on the primaries", () => {
    assert.deepStrictEqual(hsbToRgb(0, 100, 100), [255, 0, 0]);
    assert.deepStrictEqual(hsbToRgb(240, 100, 100), [0, 0, 255]);
    assert.deepStrictEqual(rgbToHsb(0, 255, 0), [120, 100, 100]);
    assert.deepStrictEqual(rgbToHsb(255, 255, 255), [0, 0, 100]); // white: no hue/sat
  });

  it("formats a picked colour back preserving func name and arity", () => {
    assert.strictEqual(formatColor("_RGB32", 3, 10, 20, 30, 255), "_RGB32(10, 20, 30)");
    assert.strictEqual(formatColor("_RGBA32", 4, 10, 20, 30, 128), "_RGBA32(10, 20, 30, 128)");
    // non-opaque alpha on a 3-arg call promotes to 4 args.
    assert.strictEqual(formatColor("_RGB32", 3, 10, 20, 30, 128), "_RGB32(10, 20, 30, 128)");
    // HSB stays HSB.
    assert.strictEqual(formatColor("_HSB32", 3, 0, 255, 0, 255), "_HSB32(120, 100, 100)");
  });
});
