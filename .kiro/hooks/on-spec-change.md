# Hook: on-spec-change

Trigger: when `/.kiro/specs/*.md` changes.

Action: regenerate tests via `npm run gen` and run `npm test`.

Purpose: keep generated property-based tests in sync with the spec (spec-driven development).