import * as assert from "assert";
import {
  mkl,
  cvl,
  mki,
  cvi,
  encode,
  splitMessage,
  packLineList,
  FrameReader,
  interpret,
  parseCallStack,
  parseFrame,
  parseAddressRead,
  decodeValue,
  VWatchIn,
  VWatchOut,
} from "../../core/vwatchProtocol";

// Unit tests for the vscode-free vwatch protocol codec. These pin the wire
// format against `vwatch.bm` so the debug session can be trusted end-to-end
// without a live QB64PE program.
describe("core/vwatchProtocol", () => {
  describe("MKL$/MKI$ packing", () => {
    it("round-trips a LONG little-endian", () => {
      assert.strictEqual(cvl(mkl(0)), 0);
      assert.strictEqual(cvl(mkl(1)), 1);
      assert.strictEqual(cvl(mkl(-1)), -1);
      assert.strictEqual(cvl(mkl(305419896)), 305419896);
      // little-endian byte order
      assert.deepStrictEqual([...mkl(1)], [1, 0, 0, 0]);
    });

    it("round-trips an INTEGER little-endian", () => {
      assert.strictEqual(cvi(mki(0)), 0);
      assert.strictEqual(cvi(mki(258)), 258);
      assert.deepStrictEqual([...mki(258)], [2, 1]);
    });
  });

  describe("encode / splitMessage", () => {
    it("frames a value-less command", () => {
      const buf = encode(VWatchOut.Run);
      assert.strictEqual(cvl(buf, 0), 3); // "run"
      assert.strictEqual(buf.subarray(4).toString("latin1"), "run");
    });

    it("frames command:value and splits on the FIRST colon only", () => {
      const buf = encode("quit", "Program: ended.");
      const msg = splitMessage(buf.subarray(4));
      assert.strictEqual(msg.command, "quit");
      assert.strictEqual(msg.value.toString("latin1"), "Program: ended.");
    });

    it("packs a binary value (breakpoint list)", () => {
      const buf = encode(VWatchOut.BreakpointList, packLineList([5, 12, 40]));
      const msg = splitMessage(buf.subarray(4));
      assert.strictEqual(msg.command, "breakpoint list");
      assert.strictEqual(msg.value.length, 12);
      assert.strictEqual(cvl(msg.value, 0), 5);
      assert.strictEqual(cvl(msg.value, 4), 12);
      assert.strictEqual(cvl(msg.value, 8), 40);
    });

    it("treats a colon-less payload as an all-command message", () => {
      const msg = splitMessage(Buffer.from("leave input", "latin1"));
      assert.strictEqual(msg.command, "leave input");
      assert.strictEqual(msg.value.length, 0);
    });
  });

  describe("FrameReader", () => {
    it("reads one whole frame", () => {
      const r = new FrameReader();
      r.push(encode("current sub", "Main"));
      const m = r.next();
      assert.ok(m);
      assert.strictEqual(m!.command, "current sub");
      assert.strictEqual(m!.value.toString("latin1"), "Main");
      assert.strictEqual(r.next(), null);
    });

    it("waits for the full payload across split reads", () => {
      const full = encode("line number", mkl(42));
      const r = new FrameReader();
      r.push(full.subarray(0, 2)); // half the length prefix
      assert.strictEqual(r.next(), null);
      r.push(full.subarray(2, 6)); // rest of prefix + 2 payload bytes
      assert.strictEqual(r.next(), null);
      r.push(full.subarray(6)); // remainder
      const m = r.next();
      assert.ok(m);
      assert.strictEqual(m!.command, "line number");
      assert.strictEqual(cvl(m!.value, 0), 42);
    });

    it("drains multiple messages from one packet", () => {
      const packet = Buffer.concat([
        encode("me", "/path/to/prog"),
        encode("hwnd", mkl(999)),
        encode("run"),
      ]);
      const r = new FrameReader();
      r.push(packet);
      const msgs = r.drain();
      assert.strictEqual(msgs.length, 3);
      assert.strictEqual(msgs[0].command, "me");
      assert.strictEqual(msgs[1].command, "hwnd");
      assert.strictEqual(msgs[2].command, "run");
    });
  });

  describe("interpret", () => {
    it("classifies a plain-line stop", () => {
      const m = interpret(splitMessage(encode("line number", mkl(7)).subarray(4)));
      assert.deepStrictEqual(m, { kind: "stopped", reason: "step", line: 7 });
    });

    it("classifies a breakpoint stop", () => {
      const m = interpret(splitMessage(encode("breakpoint", mkl(15)).subarray(4)));
      assert.deepStrictEqual(m, {
        kind: "stopped",
        reason: "breakpoint",
        line: 15,
      });
    });

    it("classifies the handshake and quit", () => {
      assert.deepStrictEqual(
        interpret({ command: VWatchIn.Me, value: Buffer.from("prog.exe") }),
        { kind: "me", command: "prog.exe" }
      );
      assert.deepStrictEqual(
        interpret({ command: VWatchIn.Quit, value: Buffer.from("Program ended.") }),
        { kind: "quit", reason: "Program ended." }
      );
    });

    it("preserves unknown commands instead of throwing", () => {
      const m = interpret({ command: "future thing", value: Buffer.from("x") });
      assert.strictEqual(m.kind, "unknown");
    });
  });

  describe("call stack parsing", () => {
    it("parses CHR$(0)-separated `subname, line NNN` frames", () => {
      const value = Buffer.from("DrawBox, line 12\0Main, line 3", "latin1");
      const frames = parseCallStack(value);
      assert.strictEqual(frames.length, 2);
      assert.deepStrictEqual(
        { sub: frames[0].sub, line: frames[0].line },
        { sub: "DrawBox", line: 12 }
      );
      assert.deepStrictEqual(
        { sub: frames[1].sub, line: frames[1].line },
        { sub: "Main", line: 3 }
      );
    });

    it("returns an empty stack for an empty value", () => {
      assert.deepStrictEqual(parseCallStack(Buffer.alloc(0)), []);
    });

    it("keeps an unparseable frame as raw text", () => {
      const f = parseFrame("weird frame text");
      assert.strictEqual(f.sub, "weird frame text");
      assert.strictEqual(f.line, undefined);
    });
  });

  describe("address read parsing", () => {
    it("splits the four MKL$ headers from the value bytes", () => {
      const value = Buffer.concat([mkl(1), mkl(0), mkl(0), mkl(9), mkl(1234)]);
      const read = parseAddressRead(value);
      assert.strictEqual(read.tempIndex, 1);
      assert.strictEqual(read.arrayIndex, 0);
      assert.strictEqual(read.element, 0);
      assert.strictEqual(read.storage, 9);
      assert.strictEqual(cvl(read.bytes, 0), 1234);
    });
  });

  describe("decodeValue", () => {
    it("decodes integer types", () => {
      assert.strictEqual(decodeValue("_BYTE", Buffer.from([0xff]))!.text, "-1");
      assert.strictEqual(
        decodeValue("_UNSIGNED _BYTE", Buffer.from([0xff]))!.text,
        "255"
      );
      assert.strictEqual(decodeValue("INTEGER", mki(-2))!.text, "-2");
      assert.strictEqual(decodeValue("LONG", mkl(70000))!.text, "70000");
      assert.strictEqual(
        decodeValue("_UNSIGNED LONG", mkl(-1))!.text,
        "4294967295"
      );
    });

    it("decodes 64-bit types via BigInt", () => {
      const b = Buffer.alloc(8);
      b.writeBigInt64LE(9007199254740993n, 0); // beyond Number precision
      assert.strictEqual(decodeValue("_INTEGER64", b)!.text, "9007199254740993");
    });

    it("decodes floating point", () => {
      const s = Buffer.alloc(4);
      s.writeFloatLE(1.5, 0);
      assert.strictEqual(decodeValue("SINGLE", s)!.text, "1.5");
      const d = Buffer.alloc(8);
      d.writeDoubleLE(3.25, 0);
      assert.strictEqual(decodeValue("DOUBLE", d)!.text, "3.25");
    });

    it("flags _FLOAT as approximate", () => {
      const f = Buffer.alloc(10);
      f.writeDoubleLE(2.5, 0);
      const r = decodeValue("_FLOAT", f);
      assert.strictEqual(r!.text, "2.5");
      assert.strictEqual(r!.approximate, true);
    });

    it("trims trailing NULs from strings", () => {
      assert.strictEqual(
        decodeValue("STRING", Buffer.from("hi\0\0", "latin1"))!.text,
        "hi"
      );
      assert.strictEqual(
        decodeValue("STRING * 4", Buffer.from("ab\0\0", "latin1"))!.text,
        "ab"
      );
    });

    it("returns null when bytes are too short", () => {
      assert.strictEqual(decodeValue("LONG", Buffer.from([1, 2])), null);
    });
  });
});
