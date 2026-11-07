# GhostSpec

## Goal
Generate property-based tests from a Kiro-style spec.

## Core module
- `parseSpec(text): Spec`
- `generateTests(spec): string`

## Invariants
- parseSpec never throws.
- generateTests always returns a string.
- Output always contains import lines.