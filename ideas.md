# Kiroween 2026 — Winning Strategy & Idea Proposals

Theme: *code in dark mode*. Hosted by Kiro/AWS on Devpost.

## 1. Hackathon Overview

### Dates
- Registration: Oct 13 – Dec 4, 2026
- Submission window: Oct 30 9:00 AM PT – Dec 4 2:00 PM PT
- Judging: Dec 16, 2026 – Jan 29, 2027
- Winners announced: ~Feb 3, 2027

### Categories
1. **Resurrection** — revive dead technology
2. **Frankenstein** — stitch incompatible technologies together
3. **Skeleton Crew** — lean template + 2 distinct apps (two repo folders)
4. **Costume Contest** — any app with haunting, polished UI

### Prizes
- Overall: 1st $30k, 2nd $20k, 3rd $10k
- Category: $5k each
- Bonuses: Best Startup $10k; Best Ghost of Kiroween Past $2k; Best Kiro Crew App $1k; Best Student per category $1.5k + 1yr Pro Max; Best Demo $1k; Blog Prize 2000 credits ×100; Social Blitz 3-month Pro+ ×5
- $100k+ total; 4000 Kiro credits per team.

### Judging Criteria (equal, 20% each)
1. Potential Impact
2. Technological Implementation (Kiro usage depth)
3. Design
4. Innovation / Idea
5. Presentation (video)

### Submission Requirements
- Public GitHub repo, open-source license
- `/.kiro` directory at root: specs, hooks, steering
- Demo video <3 min, public on YouTube
- Text description
- Working app URL
- Kiro usage writeup
- Skeleton Crew: 2 separate repo folders
- **Insufficient Kiro usage = disqualification**

### Kiro Features to Leverage (max Tech score)
IDE/CLI/Web/Crew · custom agents · agent hooks · spec-driven development · steering docs · MCP · property-based testing · Kiro powers

---

## 2. Deep Analysis: What Wins

The judging is five equally weighted axes. Two are objective-ish (Tech Implementation, Design), three subjective (Impact, Innovation, Presentation). The dominant failure mode is a weak **Presentation** (video) and shallow Kiro usage. Winners likely:

- Have a **single, instantly legible idea** that can be explained in 15 seconds.
- Show **visible Kiro artifacts** (`/.kiro/specs`, hooks firing, steering in action) in the video.
- Use **property-based tests** to claim correctness credibly.
- Have a **polished, themed UI** (Costume Contest is the easiest differentiator).
- Solve a **real, painful problem** (Impact).

Matt Pocock philosophy applied:
- **Deep modules**: small public interface, large internal behavior (e.g., one `ingest()` function hiding parsing/chunking/embedding).
- **Spec-driven**: write `spec.md` before code; Kiro spec is the contract.
- **TDD + property-based tests**: red/green/refactor; invariants like "no PII leaks", "round-trip fidelity".
- **Tracer-bullet tickets**: vertical slices that run end-to-end early.
- **Domain modeling/glossary**: `GLOSSARY.md` in `/.kiro/steering`.
- **ADRs**: `docs/adr/` for key decisions.
- **Prototype** to settle design questions before committing.
- **Two-axis code review**: Standards + Spec.
- **Retro** after each milestone.

---

## 3. Strategy

1. Pick **one category primary + one bonus target**. Recommend **Costume Contest + Best Demo + Best Startup** (highest expected value).
2. Build a **deep module** core with property-based tests; expose thin UI.
3. Make Kiro usage **visible and auditable**: specs, hooks, steering, custom agent, MCP, powers, PBT.
4. Video first: script the 3-min demo before coding; record early and iterate.
5. Tracer-bullet: deploy a working (ugly) app by week 2; polish after.
6. Keep team ≤3; assign roles: tech lead, design/video, Kiro-integration lead.

---

## 4. Idea Proposals

### Idea 1 — "Séance": Resurrect Dead APIs
- **Category:** Resurrection
- **Concept:** Upload an OpenAPI/SOAP/WSDL spec from a deprecated API; Kiro generates a live mock + adapter that resurrects it behind a modern REST façade with synthetic data.
- **Why strong (criteria):** Impact (legacy migration pain), Tech (MCP + spec-driven codegen + PBT on round-trips), Innovation (auto-resurrection), Design (haunted séance UI), Presentation (before/after demo).
- **Kiro usage:** Spec-driven generation, custom agent "Necromancer", hooks on spec change to regenerate, steering glossary, PBT (round-trip equivalence), MCP to fetch specs.
- **Bonuses:** Best Demo, Best Startup.
- **Tech stack:** Kiro CLI, Python/FastAPI, React+Tailwind, Postgres, Docker.
- **Demo plan:** Show dead API failing → upload spec → séance UI → live calls succeed → PBT report.
- **Risks:** Scope creep in codegen. Mitigate: limit to OpenAPI 3 + one legacy format.

### Idea 2 — "Frankenstack": Polyglot Micro-App Builder
- **Category:** Frankenstein
- **Concept:** Drag-and-drop builder that stitches a Rust WASM compute, Python ML, Go service, and TS frontend into one app; Kiro orchestrates glue code.
- **Why strong:** Innovation (incompatible techs), Tech (multi-language + Kiro Crew), Impact (full-stack speed).
- **Kiro usage:** Kiro Crew agents per language, hooks, MCP, steering.
- **Bonuses:** Best Kiro Crew App, Best Startup.
- **Tech stack:** Kiro Web/Crew, Rust/WASM, Python, Go, React.
- **Demo plan:** Live stitch of 4 languages → working app in 90s.
- **Risks:** Integration complexity. Mitigate: pre-tested glue templates.

### Idea 3 — "BoneKit": Skeleton Crew Template
- **Category:** Skeleton Crew
- **Concept:** A lean "bone" template (auth, data, deploy) + two distinct apps: a habit tracker and a recipe planner, both from the template.
- **Why strong:** Demonstrates reuse; clear spec; measurable diff.
- **Kiro usage:** Spec-driven template, hooks, steering, PBT.
- **Bonuses:** Best Student.
- **Tech stack:** Next.js, Supabase, Vercel.
- **Demo plan:** Show template → fork → two apps live.
- **Risks:** Apps too similar. Mitigate: divergent domains.

### Idea 4 — "HauntUI": Costume Contest Showcase App
- **Category:** Costume Contest
- **Concept:** A polished, haunting UI for a "ghost task manager" with particle effects, sound, dark-mode-first design, micro-interactions.
- **Why strong:** Design axis maxed; Innovation in interaction; Presentation.
- **Kiro usage:** Steering for design tokens, hooks for asset gen, spec for components.
- **Bonuses:** Best Demo, Social Blitz.
- **Tech stack:** React, Framer Motion, Three.js, Tailwind.
- **Demo plan:** 90s cinematic walkthrough + Kiro artifacts.
- **Risks:** Polish time. Mitigate: component library early.

### Idea 5 — "GhostWriter": AI Commit Narrator
- **Category:** Costume Contest / Startup
- **Concept:** Reads git history and generates a "ghost story" of the codebase with animated timeline; helps onboarding.
- **Why strong:** Impact (onboarding), Innovation, Presentation.
- **Kiro usage:** MCP git, custom agent, spec, PBT.
- **Bonuses:** Best Startup, Blog Prize.
- **Tech stack:** Kiro CLI, Node, React, D3.
- **Demo plan:** Pick famous repo → ghost story in 60s.
- **Risks:** Privacy. Mitigate: local-only mode.

### Idea 6 — "Crypt": Encrypted Dead-Drop Messenger
- **Category:** Frankenstein (crypto + stego)
- **Concept:** Hide messages in image/audio via steganography; Kiro wires incompatible libs.
- **Why strong:** Innovation, Tech.
- **Kiro usage:** Frankenstein glue, PBT (round-trip), hooks.
- **Bonuses:** Best Demo.
- **Tech stack:** Python, Rust, TS.
- **Demo plan:** Send secret → extract → verify.
- **Risks:** Legal/abuse. Mitigate: consent framing, watermarking.

### Idea 7 — "Reaper": Cost Optimizer for Cloud
- **Category:** Resurrection (revive idle resources)
- **Concept:** Scans cloud for zombie resources, resurrects useful ones, kills wasteful, reports savings.
- **Why strong:** Impact ($), Innovation.
- **Kiro usage:** MCP cloud, spec, steering, PBT.
- **Bonuses:** Best Startup.
- **Tech stack:** Python, AWS SDK, React.
- **Demo plan:** Before/after cost dashboard.
- **Risks:** Cloud creds. Mitigate: read-only demo account.

### Idea 8 — "WraithTest": Property-Based Test Generator
- **Category:** Costume Contest
- **Concept:** Kiro-powered tool that generates property-based tests from specs; visualizes counterexamples as "ghosts".
- **Why strong:** Tech (PBT), Innovation, Impact (quality).
- **Kiro usage:** Deep: specs→tests, hooks, PBT, MCP.
- **Bonuses:** Blog Prize, Best Demo.
- **Tech stack:** Kiro, Python (hypothesis), TS (fast-check), React.
- **Demo plan:** Spec → generated tests → failing ghost → fix.
- **Risks:** Overpromising. Mitigate: one language focus.

---

## 5. Recommended Pick

**Idea 4 (HauntUI) + Idea 8 (WraithTest) hybrid: "GhostSpec"** — a haunting, polished property-based test generator driven by Kiro specs. Category: Costume Contest (UI) + strong Tech Implementation (PBT + spec-driven). Bonus targets: Best Demo, Best Startup, Blog Prize. This maximizes two axes (Design + Tech) while keeping scope to a deep module (spec→tests) with a thin, beautiful UI.

Rationale: Costume Contest is least crowded on "polish"; PBT gives credibility; spec-driven maps perfectly to Kiro's core strength; video can be cinematic.

---

## 6. Execution Roadmap (Tracer-Bullet)

### Week 1 (by Nov 13)
- Spec v1 in `/.kiro/specs/ghostspec.md`
- Glossary + ADR-001 (core module boundary)
- Prototype UI in Figma/Paper; settle interactions
- Repo scaffold + CI

### Week 2 (by Nov 20)
- Deep module `generate(spec) -> tests` working end-to-end
- Property-based tests on generator (round-trip, no-crash)
- Deploy ugly working URL

### Week 3 (by Nov 27)
- Haunting UI polish (motion, sound, dark-mode)
- Custom Kiro agent + hooks + steering + MCP + powers
- Video script v1; record rough cut

### Week 4 (by Dec 4)
- Code review (standards + spec) pass
- Retro; fix top 3 issues
- Final video (<3min), submission, Kiro writeup
- Buffer 2 days

### Deliverables Checklist
- [ ] Public repo + OSS license
- [ ] `/.kiro` with specs/hooks/steering
- [ ] Working URL
- [ ] YouTube video <3min public
- [ ] Text description + Kiro writeup
- [ ] PBT report in repo

---

## 7. Risks & Mitigations (Global)
- Kiro usage insufficient → disqualification: audit `/.kiro` weekly; screenshot hooks firing.
- Video weak → rehearse; script first; record multiple takes.
- Scope creep → tracer-bullet; cut features by week 3.
- Polish debt → allocate 40% time to UI last 10 days.
- Team coordination → daily 15-min standup; ADRs for decisions.

---

## 8. Sources & Notes
- Hackathon facts provided by user research; verify on Devpost before submission.
- Matt Pocock philosophy: deep modules, spec-driven, TDD/PBT, tracer bullets, domain modeling, ADRs, prototype, two-axis review, retro.
- Primary sources to cite in final writeup: Kiro docs, AWS docs, Devpost rules page.
