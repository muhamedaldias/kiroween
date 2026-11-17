import type { Spec, Property } from "./spec.js";
import {
  parseParameters,
  generateArbitrary,
  generatePropertyCall,
  generateDestructuredParams,
  generateAssertion
} from "./types.js";

export interface GenerationOptions {
  framework?: "vitest" | "jest" | "ava" | "node:test";
  includeComments?: boolean;
  includeImports?: boolean;
  includeTodo?: boolean;
}

export interface GeneratedTest {
  code: string;
  framework: string;
  propertiesCovered: number;
  warnings: string[];
  hasPlaceholders: boolean;
}

// Detect framework from spec name or default to vitest
export function detectFramework(spec: Spec, options?: GenerationOptions): string {
  const nameLower = spec.name.toLowerCase();
  
  if (options?.framework) {
    return options.framework;
  }
  
  // Check framework in order of specificity
  if (nameLower.includes("node:test") || nameLower.includes("node-test")) return "node:test";
  if (nameLower.includes("node")) return "node:test";
  if (nameLower.includes("jest")) return "jest";
  if (nameLower.includes("ava")) return "ava";
  if (nameLower.includes("vitest")) return "vitest";
  
  return "vitest";
}

// Generate appropriate import statements
export function generateImports(framework: string): string {
  switch (framework) {
    case "jest":
      return `import * as fc from "fast-check";\n`;
    case "ava":
      return `import test from "ava";\nimport * as fc from "fast-check";\n`;
    case "node:test":
      return `import { test } from "node:test";\nimport * as fc from "fast-check";\n`;
    case "vitest":
    default:
      return `import { test, expect, describe } from "vitest";\nimport * as fc from "fast-check";\n`;
  }
}

// Generate test function header
export function generateTestHeader(framework: string): string {
  if (framework === "vitest") {
    return `import { test, expect, describe } from "vitest";\nimport * as fc from "fast-check";\n`;
  }
  if (framework === "jest") {
    return `import * as fc from "fast-check";\n`;
  }
  if (framework === "ava") {
    return `import test from "ava";\nimport * as fc from "fast-check";\n`;
  }
  if (framework === "node:test") {
    return `import { test } from "node:test";\nimport * as fc from "fast-check";\n`;
  }
  return `import * as fc from "fast-check";\n`;
}

// Escape special characters in test names
function escapeTestName(name: string): string {
  return name
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, " ")
    .replace(/\r/g, " ")
    .substring(0, 100);
}

// Generate property test based on kind and input
function renderProperty(p: Property, framework: string, options?: GenerationOptions): {
  code: string;
  hasPlaceholder: boolean;
} {
  const indent = "    ";
  const params = parseParameters(p.input || p.name);
  const hasTodo = options?.includeTodo !== false;
  
  const assertion = generateAssertion(p.kind, p.expected, params, p.input);
  
  // Determine if this is a placeholder
  const isPlaceholder = assertion.assertion.includes("/* TODO:") || 
                       assertion.assertion.includes("encode") || 
                       assertion.assertion.includes("decode");
  
  const comment = options?.includeComments 
    ? `${indent}// Property: ${p.name}(${p.input}) -> ${p.expected || 'true'}\n`
    : "";
  
  const propertyCall = generatePropertyCall(params);
  const destructured = generateDestructuredParams(params);
  
  // Build the test based on framework
  // Add suffix for specific property kinds
  const testName = p.kind === "no-crash" 
    ? `${p.name} does not crash`
    : p.name;
  
  if (framework === "vitest" || framework === "jest") {
    // For vitest and jest, we use test() with fc.assert
    
    // Determine the arbitrary
    let arbitrary = propertyCall;
    if (params.length === 1) {
      const arb = generateArbitrary(params[0].type);
      arbitrary = arb.arbitrary;
    }
    
    return {
      code: `test("${escapeTestName(testName)}", () => {
${indent}${comment}${indent}fc.assert(
${indent}  fc.property(
${indent}    ${arbitrary},
${indent}    (${destructured}) => {
${indent}      ${hasTodo ? `// TODO: Implement your assertion here` : assertion.comment}
${indent}      ${assertion.assertion}
${indent}    }
${indent}  )
${indent});
${indent}})\n`,
      hasPlaceholder: isPlaceholder
    };
  } else if (framework === "ava") {
    const testName = p.kind === "no-crash" ? `${p.name} does not crash` : p.name;
    return {
      code: `test("${escapeTestName(testName)}", t => {
${indent}${comment}${indent}t.true(
${indent}  fc.check(
${indent}    fc.property(
${indent}      ${propertyCall},
${indent}      (${destructured}) => {
${indent}        ${hasTodo ? `// TODO: Implement your assertion here` : assertion.comment}
${indent}        return ${assertion.assertion.replace(/expect\(/g, '').replace(/\)$/g, '')};
${indent}      }
${indent}    )
${indent}  )
${indent});
${indent}})\n`,
      hasPlaceholder: isPlaceholder
    };
  } else {
    // node:test
    const testName = p.kind === "no-crash" ? `${p.name} does not crash` : p.name;
    return {
      code: `test("${escapeTestName(testName)}", () => {
${indent}${comment}${indent}fc.assert(
${indent}  fc.property(
${indent}    ${propertyCall},
${indent}    (${destructured}) => {
${indent}      ${hasTodo ? `// TODO: Implement your assertion here` : assertion.comment}
${indent}      ${assertion.assertion}
${indent}    }
${indent}  )
${indent});
${indent}})\n`,
      hasPlaceholder: isPlaceholder
    };
  }
}

// Generate test file with actual executable tests
function generateTestFile(
  spec: Spec,
  framework: string,
  options?: GenerationOptions
): GeneratedTest {
  const warnings: string[] = [];
  let hasPlaceholders = false;
  
  if (spec.properties.length === 0) {
    warnings.push("No properties found in spec - generating empty test file");
  }
  
  const header = `// Generated by GhostSpec from spec: ${spec.name}
// ${new Date().toISOString()}
// DO NOT EDIT DIRECTLY - Edit the spec and regenerate

${generateImports(framework)}`;
  
  const renderedProperties = spec.properties.map((p: Property) => {
    const result = renderProperty(p, framework, options);
    if (result.hasPlaceholder) {
      hasPlaceholders = true;
    }
    return result.code;
  });
  
  // Check for properties that need implementation
  const propertiesNeedingImplementation = spec.properties.filter(
    (p: Property) => !p.expected || p.kind === "invariant" || p.kind === "roundtrip"
  );
  
  if (propertiesNeedingImplementation.length > 0 && !options?.includeTodo) {
    warnings.push(`${propertiesNeedingImplementation.length} properties need implementation - add expected values or implement functions`);
  }
  
  if (hasPlaceholders && !warnings.includes("Some tests contain TODO placeholders")) {
    warnings.push("Some tests contain TODO placeholders - replace with actual implementations");
  }
  
  const body = spec.properties.length > 0
    ? `describe("${escapeTestName(spec.name)}", () => {
${renderedProperties.map((line: string) => "  " + line).join("")}
});\n`
    : `// No properties to test - add properties to your spec\n`;
  
  const footer = `// To regenerate tests, update your spec and run GhostSpec again
// For more information, see: https://github.com/muhamedaldias/kiroween
`;
  
  const code = header + body + footer;
  
  return {
    code,
    framework,
    propertiesCovered: spec.properties.length,
    warnings,
    hasPlaceholders
  };
}

export function generateTests(
  spec: Spec,
  options?: GenerationOptions
): string {
  const framework = detectFramework(spec, options);
  const result = generateTestFile(spec, framework, { ...options, includeTodo: true });
  
  if (result.warnings.length > 0 && options?.includeComments) {
    return `// WARNINGS:\n${result.warnings.map(w => `// - ${w}`).join("\n")}\n\n${result.code}`;
  }
  
  return result.code;
}

export function generateTestsWithMetadata(
  spec: Spec,
  options?: GenerationOptions
): GeneratedTest {
  const framework = detectFramework(spec, options);
  return generateTestFile(spec, framework, { ...options, includeTodo: false });
}

// Generate tests without placeholders (for when implementations are provided)
export function generateTestsWithoutPlaceholders(
  spec: Spec,
  options?: GenerationOptions
): GeneratedTest {
  const framework = detectFramework(spec, options);
  return generateTestFile(spec, framework, { ...options, includeTodo: false });
}
