# Kiro Usage Writeup — GhostSpec

## Kiro IDE / CLI / Web / Crew
- IDE used for spec-driven development and steering.
- CLI for hooks (`on-spec-change`) and test runs.
- Web for previewing the haunting UI.
- Crew (Necromancer agent) orchestrates spec→tests.

## Custom Agents
- `Necromancer` (`.kiro/agents/necromancer.md`) reads specs + glossary and generates fast-check tests.

## Agent Hooks
- `on-spec-change` regenerates tests and runs the suite on every spec edit.

## Spec-Driven Development
- `/.kiro/specs/ghostspec.md` is the single source of truth; `parseSpec`/`generateTests` implement it.

## Steering Docs
- `glossary.md`, `design-tokens.md` shape Kiro responses and UI consistency.

## MCP
- GitHub MCP server configured in `.kiro/mcp.json` for repo automation.

## Property-Based Testing
- `fast-check` invariants: parseSpec never throws; generateTests always returns a string containing imports. See `docs/pbt-report.md`.

## Kiro Powers
- Leveraged bundled best practices for spec-driven generation and PBT.