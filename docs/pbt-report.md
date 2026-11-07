# Property-Based Test Report

Generator: fast-check
Invariants verified:
1. `parseSpec` never throws on arbitrary string input.
2. `generateTests(parseSpec(s))` always returns a string.
3. Output always contains `import`.

All invariants pass (see `src/core/generate.test.ts`).