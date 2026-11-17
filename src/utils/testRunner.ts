/**
 * Test runner utilities for executing generated tests in the browser
 * Uses a simple mock implementation that simulates test execution
 */

import { parseSpec, type Spec } from "../core/spec.js";

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
  input?: unknown;
  expected?: unknown;
  actual?: unknown;
}

export interface TestSuiteResult {
  name: string;
  results: TestResult[];
  passed: number;
  failed: number;
  duration: number;
}

// Mock test execution that simulates property-based testing
function simulatePropertyTest(spec: Spec): TestSuiteResult {
  const results: TestResult[] = [];
  const startTime = Date.now();
  
  // For each property, simulate some test runs
  for (const prop of spec.properties) {
    // Simulate a few iterations
    const iterations = Math.min(10, Math.max(1, prop.input.length || 1));
    
    for (let i = 0; i < iterations; i++) {
      const result = simulateSingleTest(prop, i);
      results.push(result);
    }
  }
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  
  return {
    name: spec.name || "Generated Tests",
    results,
    passed,
    failed,
    duration: Date.now() - startTime
  };
}

function simulateSingleTest(prop: { name: string; kind: string; input: string; expected?: string }, iteration: number): TestResult {
  const baseDuration = Math.random() * 50 + 10;
  const testName = `${prop.name} - iteration ${iteration + 1}`;
  
  // Simulate different outcomes based on property kind
  switch (prop.kind) {
    case 'roundtrip':
      // Roundtrip tests have a 90% success rate
      if (Math.random() > 0.9) {
        return {
          name: testName,
          passed: false,
          error: "Roundtrip failed: encode(decode(x)) !== x",
          duration: baseDuration,
          input: generateMockInput(prop.input),
          expected: "original value",
          actual: "different value"
        };
      }
      return {
        name: testName,
        passed: true,
        duration: baseDuration,
        input: generateMockInput(prop.input)
      };
    
    case 'no-crash':
      // No-crash tests have a 95% success rate
      if (Math.random() > 0.95) {
        return {
          name: testName,
          passed: false,
          error: "Test crashed with error: Cannot read property 'length' of undefined",
          duration: baseDuration,
          input: generateMockInput(prop.input)
        };
      }
      return {
        name: testName,
        passed: true,
        duration: baseDuration,
        input: generateMockInput(prop.input)
      };
    
    case 'invariant':
    default:
      // Invariant tests have a 85% success rate
      if (Math.random() > 0.85) {
        return {
          name: testName,
          passed: false,
          error: `Invariant violated: ${prop.expected || 'condition not met'}`,
          duration: baseDuration,
          input: generateMockInput(prop.input),
          expected: prop.expected,
          actual: "failed condition"
        };
      }
      return {
        name: testName,
        passed: true,
        duration: baseDuration,
        input: generateMockInput(prop.input)
      };
  }
}

function generateMockInput(hint: string): unknown {
  if (!hint) {
    return generateRandomValue();
  }
  
  const lowerHint = hint.toLowerCase();
  
  if (lowerHint.includes('string') || lowerHint.includes('text') || lowerHint.includes('name')) {
    return `"mock_${Math.random().toString(36).substring(2, 8)}"`;
  }
  if (lowerHint.includes('number') || lowerHint.includes('int') || lowerHint.includes('count')) {
    return Math.floor(Math.random() * 1000);
  }
  if (lowerHint.includes('boolean') || lowerHint.includes('flag')) {
    return Math.random() > 0.5;
  }
  if (lowerHint.includes('array') || lowerHint.includes('list')) {
    const length = Math.floor(Math.random() * 5) + 1;
    return Array.from({ length }, () => generateRandomValue());
  }
  
  return generateRandomValue();
}

function generateRandomValue(): unknown {
  const type = Math.floor(Math.random() * 5);
  
  switch (type) {
    case 0:
      return `"${Math.random().toString(36).substring(2, 8)}"`;
    case 1:
      return Math.floor(Math.random() * 1000);
    case 2:
      return Math.random() > 0.5;
    case 3:
      return null;
    case 4:
      return Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => generateRandomValue());
    default:
      return undefined;
  }
}

/**
 * Execute a test suite (simulated)
 */
export async function runTestSuite(
  name: string,
  tests: Array<{ name: string; fn: () => void | Promise<void> }>
): Promise<TestSuiteResult> {
  const startTime = performance.now();
  const results: TestResult[] = [];
  
  for (const test of tests) {
    const result = await runTest(test.name, test.fn);
    results.push(result);
  }
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  
  return {
    name,
    results,
    passed,
    failed,
    duration: performance.now() - startTime
  };
}

/**
 * Execute a single test function and capture results
 */
export async function runTest(
  name: string,
  testFn: () => void | Promise<void>
): Promise<TestResult> {
  const startTime = performance.now();
  let result: TestResult;
  
  try {
    await testFn();
    result = {
      name,
      passed: true,
      duration: performance.now() - startTime
    };
  } catch (error) {
    result = {
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration: performance.now() - startTime
    };
  }
  
  return result;
}

/**
 * Execute generated test code and return results
 * This simulates what the actual test execution would look like
 */
export async function runGeneratedTests(
  specText: string
): Promise<TestSuiteResult> {
  try {
    const spec = parseSpec(specText);
    return simulatePropertyTest(spec);
  } catch (error) {
    return {
      name: "Parse Error",
      results: [
        {
          name: "Spec Parsing",
          passed: false,
          error: error instanceof Error ? error.message : "Failed to parse spec",
          duration: 0
        }
      ],
      passed: 0,
      failed: 1,
      duration: 0
    };
  }
}

/**
 * Format test results for display
 */
export function formatTestResults(results: TestSuiteResult): string {
  const lines: string[] = [
    `Test Suite: ${results.name}`,
    `Passed: ${results.passed}`,
    `Failed: ${results.failed}`,
    `Duration: ${results.duration.toFixed(2)}ms`,
    `Success Rate: ${results.passed > 0 ? ((results.passed / results.results.length) * 100).toFixed(1) : 0}%`,
    ''
  ];
  
  for (const result of results.results) {
    const status = result.passed ? '✓' : '✗';
    const name = result.name.length > 50 ? result.name.substring(0, 47) + '...' : result.name;
    lines.push(`${status} ${name}${result.error ? ` - ${result.error}` : ''}`);
  }
  
  return lines.join('\n');
}

/**
 * Get failed tests as ghost errors for visualization
 */
export function getGhostErrors(results: TestSuiteResult): Array<{
  testName: string;
  message: string;
  input: unknown;
  expected: unknown;
  actual: unknown;
}> {
  return results.results
    .filter(r => !r.passed)
    .map(r => ({
      testName: r.name,
      message: r.error || "Test failed",
      input: r.input,
      expected: r.expected,
      actual: r.actual
    }));
}

/**
 * Create a mock test runner for demonstration
 */
export function createMockTestRunner(code: string): {
  code: string;
  framework: string;
  canRun: boolean;
  message: string;
} {
  const framework = code.includes('vitest') ? 'vitest' : 
                     code.includes('jest') ? 'jest' : 
                     code.includes('ava') ? 'ava' : 'node:test';
  
  return {
    code,
    framework,
    canRun: true,
    message: 'Ready to execute tests'
  };
}
