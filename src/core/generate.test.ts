import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { parseSpec } from "./spec";
import { generateTests, generateTestsWithMetadata, detectFramework, generateImports } from "./generate";

describe("parseSpec", () => {
  it("extracts name from spec declaration", () => {
    const s = parseSpec("# spec: Foo\n");
    expect(s.name).toBe("Foo");
    expect(s.errors).toBeUndefined();
  });

  it("parses simple properties", () => {
    const s = parseSpec(`# spec: Test
- property testProp(input): expected`);
    expect(s.properties).toHaveLength(1);
    expect(s.properties[0].name).toBe("testProp");
    expect(s.properties[0].input).toBe("input");
    expect(s.properties[0].expected).toBe("expected");
  });

  it("parses multiple properties", () => {
    const s = parseSpec(`# spec: Test
- property prop1(a): b
- property prop2(x): y`);
    expect(s.properties).toHaveLength(2);
    expect(s.properties[0].name).toBe("prop1");
    expect(s.properties[1].name).toBe("prop2");
  });

  it("detects roundtrip properties", () => {
    const s = parseSpec(`# spec: Test
- property roundtripTest(a): test`);
    expect(s.properties[0].kind).toBe("roundtrip");
  });

  it("detects no-crash properties", () => {
    const s = parseSpec(`# spec: Test
- property no-crashTest(a): test`);
    expect(s.properties[0].kind).toBe("no-crash");
  });

  it("detects noCrash properties (alternative syntax)", () => {
    const s = parseSpec(`# spec: Test
- property noCrashTest(a): test`);
    expect(s.properties[0].kind).toBe("no-crash");
  });

  it("handles alternative property syntax", () => {
    const s = parseSpec(`# spec: Test
- property addCommutative: roundtrip(a + b) -> b + a`);
    expect(s.properties).toHaveLength(1);
    expect(s.properties[0].name).toBe("addCommutative");
    expect(s.properties[0].kind).toBe("roundtrip");
    expect(s.properties[0].input).toBe("a + b");
    expect(s.properties[0].expected).toBe("b + a");
  });

  it("handles simple property syntax", () => {
    const s = parseSpec(`# spec: Test
- property alwaysTrue: invariant(input) -> true`);
    expect(s.properties).toHaveLength(1);
    expect(s.properties[0].name).toBe("alwaysTrue");
    expect(s.properties[0].kind).toBe("invariant");
  });

  it("skips comments and empty lines", () => {
    const s = parseSpec(`# spec: Test

# This is a comment
- property test(a): b

# Another comment`);
    expect(s.properties).toHaveLength(1);
    expect(s.properties[0].name).toBe("test");
  });

  it("never throws on arbitrary input", () => {
    fc.assert(
      fc.property(fc.string(), (t) => {
        const result = parseSpec(t);
        // Should always return a Spec object
        expect(result).toHaveProperty("name");
        expect(result).toHaveProperty("properties");
        expect(Array.isArray(result.properties)).toBe(true);
        return true;
      })
    );
  });

  it("validates input type", () => {
    // @ts-expect-error - Testing invalid input
    const s = parseSpec(123);
    expect(s.errors).toBeDefined();
    expect(s.errors![0].severity).toBe("error");
    expect(s.errors![0].message).toContain("must be a string");
  });

  it("validates spec length", () => {
    const longSpec = "a".repeat(100001);
    const s = parseSpec(longSpec);
    expect(s.errors).toBeDefined();
    expect(s.errors![0].severity).toBe("error");
    expect(s.errors![0].message).toContain("maximum length");
  });

  it("validates spec name length", () => {
    const s = parseSpec(`# spec: ${"a".repeat(101)}\n- property test(a): b`);
    expect(s.errors).toBeDefined();
    expect(s.errors!.some(e => e.message.includes("1-100 characters"))).toBe(true);
  });

  it("validates property name length", () => {
    const s = parseSpec(`# spec: Test\n- property ${"a".repeat(101)}(a): b`);
    expect(s.errors).toBeDefined();
    expect(s.errors!.some(e => e.message.includes("1-100 characters"))).toBe(true);
  });

  it("detects duplicate property names", () => {
    const s = parseSpec(`# spec: Test
- property duplicate(a): b
- property duplicate(c): d`);
    // This should be caught by validateSpec, not parseSpec
    expect(s.properties).toHaveLength(2);
  });

  it("handles malformed property lines", () => {
    const s = parseSpec(`# spec: Test
- invalid line format
- property valid(a): b`);
    expect(s.properties).toHaveLength(1);
    expect(s.properties[0].name).toBe("valid");
    // Should have warning for invalid line
    expect(s.errors).toBeDefined();
    expect(s.errors!.some(e => e.severity === "warning")).toBe(true);
  });
});

describe("generateTests", () => {
  it("always produces a string", () => {
    fc.assert(
      fc.property(fc.string(), (t) => {
        const out = generateTests(parseSpec(t));
        return typeof out === "string" && out.length >= 0;
      })
    );
  });

  it("contains import lines", () => {
    const out = generateTests(parseSpec("# spec: X\n"));
    expect(out).toContain("import");
    expect(out).toContain("fast-check");
  });

  it("contains spec name in header", () => {
    const out = generateTests(parseSpec("# spec: MyTestSpec\n"));
    expect(out).toContain("MyTestSpec");
  });

  it("generates describe block for properties", () => {
    const out = generateTests(
      parseSpec(`# spec: Test
- property test(a): b`)
    );
    expect(out).toContain("describe");
    expect(out).toContain("test");
  });

  it("generates roundtrip tests", () => {
    const out = generateTests(
      parseSpec(`# spec: Test
- property roundtripTest(input): test`)
    );
    expect(out).toContain("roundtrip");
  });

  it("generates no-crash tests", () => {
    const out = generateTests(
      parseSpec(`# spec: Test
- property no-crashTest(input): test`)
    );
    expect(out).toContain("does not crash");
  });

  it("generates invariant tests", () => {
    const out = generateTests(
      parseSpec(`# spec: Test
- property invariantTest(input): test`)
    );
    expect(out).toContain("fc.assert");
  });

  it("includes framework in output", () => {
    const out = generateTests(
      parseSpec("# spec: Test\n- property test(a): b"),
      { framework: "vitest" }
    );
    expect(out).toContain("vitest");
  });

  it("detects vitest framework by default", () => {
    const spec = parseSpec("# spec: MySpec\n");
    expect(detectFramework(spec)).toBe("vitest");
  });

  it("detects jest framework from spec name", () => {
    const spec = parseSpec("# spec: JestSpec\n");
    expect(detectFramework(spec)).toBe("jest");
  });

  it("detects ava framework from spec name", () => {
    const spec = parseSpec("# spec: AvaTest\n");
    expect(detectFramework(spec)).toBe("ava");
  });

  it("detects node:test framework from spec name", () => {
    const spec = parseSpec("# spec: NodeSpec\n");
    expect(detectFramework(spec)).toBe("node:test");
  });

  it("uses explicit framework option when provided", () => {
    const spec = parseSpec("# spec: JestSpec\n");
    expect(detectFramework(spec, { framework: "vitest" })).toBe("vitest");
  });

  it("generates correct imports for vitest", () => {
    const imports = generateImports("vitest");
    expect(imports).toContain("vitest");
    expect(imports).toContain("fast-check");
  });

  it("generates correct imports for jest", () => {
    const imports = generateImports("jest");
    expect(imports).toContain("fast-check");
    expect(imports).not.toContain("vitest");
  });

  it("generates correct imports for ava", () => {
    const imports = generateImports("ava");
    expect(imports).toContain("ava");
    expect(imports).toContain("fast-check");
  });

  it("generates correct imports for node:test", () => {
    const imports = generateImports("node:test");
    expect(imports).toContain("node:test");
    expect(imports).toContain("fast-check");
  });
});

describe("generateTestsWithMetadata", () => {
  it("returns metadata object", () => {
    const result = generateTestsWithMetadata(
      parseSpec(`# spec: Test
- property test(a): b`)
    );
    expect(result).toHaveProperty("code");
    expect(result).toHaveProperty("framework");
    expect(result).toHaveProperty("propertiesCovered");
    expect(result).toHaveProperty("warnings");
  });

  it("tracks number of properties", () => {
    const result = generateTestsWithMetadata(
      parseSpec(`# spec: Test
- property test1(a): b
- property test2(c): d
- property test3(e): f`)
    );
    expect(result.propertiesCovered).toBe(3);
  });

  it("warns when no properties", () => {
    const result = generateTestsWithMetadata(
      parseSpec("# spec: EmptySpec\n")
    );
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("warns for placeholder implementations", () => {
    const result = generateTestsWithMetadata(
      parseSpec(`# spec: Test
- property placeholderTest: test description`)
    );
    // Should have warnings about properties needing implementation
    // This property has no expected value, so it should be flagged
    expect(result.warnings.some(w => w.includes("need implementation") || w.includes("implementations"))).toBe(true);
  });
});

describe("Edge Cases", () => {
  it("handles empty spec", () => {
    const s = parseSpec("");
    expect(s.name).toBe("UnnamedSpec");
    expect(s.properties).toHaveLength(0);
  });

  it("handles whitespace-only spec", () => {
    const s = parseSpec("   \n\n   ");
    expect(s.name).toBe("UnnamedSpec");
    expect(s.properties).toHaveLength(0);
  });

  it("handles spec with only name", () => {
    const s = parseSpec("# spec: OnlyName");
    expect(s.name).toBe("OnlyName");
    expect(s.properties).toHaveLength(0);
  });

  it("handles very long property name", () => {
    const longName = "a".repeat(100);
    const s = parseSpec(`# spec: Test\n- property ${longName}(a): b`);
    expect(s.properties[0].name).toBe(longName);
  });

  it("handles special characters in spec name", () => {
    const s = parseSpec("# spec: Test-Spec_v1.0\n");
    expect(s.name).toBe("Test-Spec_v1.0");
  });

  it("handles special characters in property name", () => {
    const s = parseSpec(`# spec: Test\n- property test-prop_v2(a): test`);
    expect(s.properties[0].name).toBe("test-prop_v2");
  });
});
