import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { parseSpec } from "./spec";
import { generateTests } from "./generate";

describe("parseSpec", () => {
  it("extracts name", () => {
    const s = parseSpec("# spec: Foo\n");
    expect(s.name).toBe("Foo");
  });
  it("never throws on arbitrary input", () => {
    fc.assert(fc.property(fc.string(), (t) => {
      parseSpec(t);
      return true;
    }));
  });
});

describe("generateTests", () => {
  it("always produces a string", () => {
    fc.assert(fc.property(fc.string(), (t) => {
      const out = generateTests(parseSpec(t));
      return typeof out === "string" && out.length >= 0;
    }));
  });
  it("contains import lines", () => {
    const out = generateTests(parseSpec("# spec: X\n"));
    expect(out).toContain("import");
  });
});