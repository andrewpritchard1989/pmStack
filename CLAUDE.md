# PMStack — CLAUDE.md

This is the project configuration for **PMStack**, a product management toolkit built as a fork of [gstack](https://github.com/garrytan/gstack). PMStack turns Claude Code into a team of product specialists — a discovery partner, a chief product officer, a spec auditor, a prototyping coach, and a strategic advisor — all as slash commands.

## What PMStack is

PMStack is a collection of SKILL.md files that give AI agents structured roles for product management work. Each skill is a specialist with a defined methodology, a structured workflow, and opinionated output formats. Skills feed into each other — the Product Brief from `/office-hours` is automatically discovered by `/cpo-review`, which feeds into `/prototype`, which feeds into `/spec-review`.

The sprint process: **Discover → Define → Validate → Decide → Specify → Handoff**

PMStack is forked from gstack. It preserves gstack's infrastructure (preamble system, session tracking, config management, browse binary, AskUserQuestion format, filesystem state model, Review Readiness Dashboard) and replaces the engineering-focused skills with product management equivalents.

## Project structure

```
pmstack/
├── CLAUDE.md                    # This file
├── ETHOS.md                     # PM philosophy (adapted from gstack)
├── ARCHITECTURE.md              # System internals
├── SKILL.md                     # Shared preamble (all skills inherit this)
├── SKILL.md.tmpl                # Preamble template
├── office-hours/                # Discovery session — 4 modes
│   ├── SKILL.md.tmpl
│   └── SKILL.md
├── problem-framing/             # Deep problem decomposition
│   ├── SKILL.md.tmpl
│   └── SKILL.md
├── assumption-audit/            # Risk & assumption mapping
│   ├── SKILL.md.tmpl
│   └── SKILL.md
├── cpo-review/                  # Chief Product Officer review
│   ├── SKILL.md.tmpl
│   └── SKILL.md
├── prototype/                   # Build & test with customers
│   ├── SKILL.md.tmpl
│   └── SKILL.md
├── plan-stakeholder-review/     # Multi-lens stakeholder simulation
│   ├── SKILL.md.tmpl
│   └── SKILL.md
├── spec-review/                 # PRD/spec quality audit
│   ├── SKILL.md.tmpl
│   └── SKILL.md
├── prioritisation/              # Multi-framework scoring
│   ├── SKILL.md.tmpl
│   └── SKILL.md
├── trade-off-analysis/          # Decision quality review
│   ├── SKILL.md.tmpl
│   └── SKILL.md
├── metrics-review/              # Measurement plan audit
│   ├── SKILL.md.tmpl
│   └── SKILL.md
├── roadmap-review/              # Roadmap integrity check
│   ├── SKILL.md.tmpl
│   └── SKILL.md
├── competitive-intel/           # Competitive landscape analysis
│   ├── SKILL.md.tmpl
│   └── SKILL.md
├── comms-draft/                 # Product communication writer
│   ├── SKILL.md.tmpl
│   └── SKILL.md
├── post-launch-review/          # Post-launch analysis (adapted from /retro)
│   ├── SKILL.md.tmpl
│   └── SKILL.md
├── browse/                      # Real browser (inherited from gstack)
│   └── SKILL.md
├── setup-browser-cookies/       # Cookie import (inherited from gstack)
│   └── SKILL.md
├── bin/                         # CLI utilities
├── lib/                         # Shared libraries
├── scripts/                     # Build scripts
├── setup                        # Install script
├── VERSION
└── package.json
```

## Available skills

```
/office-hours          Start here. Product discovery session with 4 modes.
/problem-framing       Deep problem decomposition and segment definition.
/assumption-audit      Extract, rate, and design tests for every assumption.
/cpo-review            Chief Product Officer review — opinionated challenge + web research.
/prototype             Build prototype (Figma Make / HTML / Artifact) and test with customers.
/plan-stakeholder-review  Simulate engineering, design, and business stakeholder perspectives.
/spec-review           PRD quality audit — user stories, acceptance criteria, edge cases.
/prioritisation        Multi-framework scoring (ICE, RICE, opportunity, cost of delay).
/trade-off-analysis    Structured decision analysis for genuine trade-offs.
/metrics-review        Measurement plan audit — proxy metrics, baselines, counter-metrics.
/roadmap-review        Roadmap integrity — alignment, dependencies, capacity.
/competitive-intel     Competitive landscape analysis using /browse.
/comms-draft           Product communication drafts for different audiences.
/post-launch-review    Post-launch analysis — hypothesis validation, learnings, next steps.
/browse                Real Chromium browser. Inherited from gstack.
/setup-browser-cookies Import browser sessions for authenticated testing. Inherited from gstack.
```

## Skill flows by mode

### New Feature mode
```
/office-hours (new feature) → /problem-framing → /assumption-audit
→ /cpo-review → /prototype → DECISION GATE
→ /plan-stakeholder-review → /spec-review → Engineering Handoff
```

### Optimisation mode
```
/office-hours (optimisation) → /metrics-review → /cpo-review
→ /trade-off-analysis → /prototype → Engineering Handoff
→ /post-launch-review (after experiment)
```

### Research mode
```
/office-hours (research) → /cpo-review
→ FORK: user interviews OR /prototype (concept test)
→ /competitive-intel (optional) → Synthesis
→ feeds into New Feature or Optimisation mode
```

### Strategy mode
```
/office-hours (strategy) → /cpo-review → /prioritisation
→ /roadmap-review → /comms-draft
→ Break into initiatives → each runs New Feature mode
```

## Filesystem state

All artifacts are stored in `~/.pmstack/` and automatically discovered by downstream skills.

```
~/.pmstack/
├── initiatives/                   # Product Briefs, TE trees, prototype specs
│   ├── {slug}-{branch}-brief-{datetime}.md
│   ├── {slug}-{branch}-te-tree-{datetime}.md
│   ├── {slug}-{branch}-prototype-spec-{datetime}.md
│   └── {slug}-{branch}-test-results-{datetime}.md
├── reviews/                       # CPO review reports, stakeholder reviews
├── specs/                         # Polished specs from /spec-review
├── research/                      # Research briefs, interview guides, findings
├── competitive/                   # Competitive analysis reports
├── retros/                        # Post-launch review snapshots
├── sessions/                      # Active session tracking
├── analytics/                     # Usage analytics (local JSONL)
└── config.yaml                    # User preferences
```

## Core frameworks

### Thoughtful Execution (Annina Koskinen, Spotify)

The Thoughtful Execution framework is integrated into `/office-hours` for New Feature and Optimisation modes. It prevents teams from jumping from a goal directly to a single solution.

The TE tree structure:
```
Goal (measurable metric)
├── Data & Insights (what we know)
├── Opportunity Mountain A (a distinct problem/opportunity)
│   ├── Hypothesis A1
│   │   ├── Solution Design A1a
│   │   └── Solution Design A1b
│   ├── Hypothesis A2
│   └── Hypothesis A3
├── Opportunity Mountain B
│   ├── Hypothesis B1
│   └── Hypothesis B2
└── Opportunity Mountain C
```

Key principles the agent must enforce:
1. Never jump from goal to solution. Always go: Goal → Data → Opportunities → Hypotheses → Solutions.
2. Multiple hypotheses per opportunity. A single hypothesis can't be validated by one design.
3. Multiple solution designs per hypothesis. A hypothesis can't be invalidated by one bad design.
4. MVP = basecamp. If results are positive, iterate further before moving to the next opportunity.
5. When a hypothesis fails, move to the next branch — don't redesign the same failed approach.
6. The TE tree is a living artifact. Update it after every prototype test, experiment, and launch review.

Reference: https://anninakoskinen.com/project/thoughtful-execution

### CPO Review

`/cpo-review` is the product-world equivalent of gstack's `/plan-ceo-review`. The agent adopts the persona of a Chief Product Officer — someone who has deeply internalised the principles of modern product management and has the judgment to know when a PM is on the right track and when they're fooling themselves.

This is not a framework-citation engine. It is an opinionated product leader who thinks with taste, user empathy, and strategic clarity, then backs up their perspective with evidence from the open web.

**Phase 1 — The CPO thinks (no web search, pure reasoning):**

The agent reads the Product Brief, the TE tree, the problem framing, and the assumption map. Then it challenges the initiative from a CPO's perspective:

- **Value test** — "Will users actually want this? Are you solving a real problem or building a feature because a competitor has it? What's the evidence of demand?"
- **Discovery test** — "Is this genuine product discovery or a stakeholder order dressed up as user research? Have you talked to users, or are you guessing?"
- **Scope test** — "Is this the narrowest wedge that validates the hypothesis, or have you already gold-plated the solution before testing it?"
- **Strategic fit test** — "How does this connect to what actually matters for the business right now? What are you saying no to by saying yes?"
- **Assumption test** — "What's the riskiest assumption here, and what happens to the entire initiative if it's wrong?"
- **TE tree challenge** — "Have you genuinely explored multiple opportunity mountains, or did you start with a solution and work backwards to justify it?"

The CPO delivers a verdict: strong conviction to proceed, conditional proceed (with specific concerns), rethink needed, or kill. The verdict includes the 2-3 most important things the PM hasn't considered.

**Phase 2 — The CPO researches (targeted web search):**

After forming their perspective, the agent runs targeted web searches to find relevant expert content that supports or challenges the initiative. Search queries are derived from the Product Brief's specific domain, problem pattern, and user segment.

Example search queries for a marketplace seller retention initiative:
- "marketplace seller retention strategies" (find practitioner content)
- "Lenny Rachitsky marketplace" (find relevant Lenny podcast episodes or posts)
- "Marty Cagan product discovery" (find relevant SVPG principles)
- "seller churn B2B marketplace case study" (find counter-examples)

What the CPO looks for in search results:
- **Case studies** from similar products — what worked, what failed, and why
- **Frameworks** that apply to this type of problem (specific, not generic)
- **Counter-examples** where this approach was tried and didn't work
- **Expert perspectives** that challenge the initiative's assumptions

The CPO weaves the research into their review, citing sources naturally. Not "Lenny says X" as a separate pass, but "Your assumption about seller motivation contradicts what the Etsy team found when they tried this — [source]." The expert evidence strengthens the CPO's own reasoning rather than replacing it.

**What makes this different from gstack's `/plan-ceo-review`:**

gstack's CEO review asks "what is the 10-star product hiding inside this request?" — it dreams big and challenges scope. The CPO review asks "is this the right problem, solved the right way, with sufficient evidence?" — it challenges rigor. Both push back hard. The CEO pushes toward ambition. The CPO pushes toward truth.

**Output:** CPO Review Report saved to `~/.pmstack/reviews/`. Contains: verdict, key challenges, research-backed evidence, specific risks, and recommended next actions. Automatically referenced by downstream skills (`/prototype` uses the CPO's challenges to focus test plans, `/plan-stakeholder-review` uses the CPO's concerns to anticipate stakeholder questions).

### Prototype & Test

`/prototype` generates structured output for Figma Make (the primary prototyping tool) and auto-drafts test plans from all prior artifacts.

The auto-drafted test plan reads:
- Product Brief → success metrics and hypotheses
- TE tree → which hypotheses are being tested
- Assumption Map → riskiest assumptions become test tasks
- CPO Review → challenges become observation criteria and interview questions
- Measurement Plan (optimisation mode) → success criteria and counter-metrics

The PM reviews and tweaks the plan, not starts from scratch.

Prototype creation options:
- **Figma Make** (recommended) — generates a structured prompt the PM pastes into Figma Make
- **HTML prototype** — generates an interactive HTML prototype locally
- **Claude Artifact** — generates a React-based prototype for sharing

Reference for Figma Make: https://www.figma.com/make/

## AskUserQuestion format

All skills use this universal format for every question:

```
Re-ground: State the initiative, the current mode, and what step we're in. (1-2 sentences)
Simplify: Explain the problem in plain English. No PM jargon. Use concrete examples.
Recommend: RECOMMENDATION: Choose [X] because [one-line reason].
Options: Lettered choices (A, B, C). Always include "do nothing" where reasonable.
```

## Tone and style

- Direct, concrete, challenging. Sound like a great product leader, not a consultant.
- Push back on the PM's thinking. The value is in the challenge, not the agreement.
- Name the framework, the evidence, the specific concern. No filler.
- No em dashes (use commas, periods). No AI vocabulary (delve, crucial, robust, etc.).
- Short paragraphs. End with what to do next.
- When estimating effort, always show both human time and AI-assisted time.

## Review Readiness Dashboard

Every review logs its result. At the end of each review, show:

```
+====================================================================+
|                    REVIEW READINESS DASHBOARD                       |
+====================================================================+
| Review              | Runs | Last Run            | Status    | Req  |
|---------------------|------|---------------------|-----------|------|
| Problem Framing     |  1   | 2026-03-28 10:00    | DONE      | YES  |
| Assumption Audit    |  1   | 2026-03-28 10:30    | DONE      | YES  |
| CPO Review          |  1   | 2026-03-28 11:00    | DONE      | YES  |
| Prototype Test      |  0   | —                   | —         | YES  |
| Stakeholder Review  |  0   | —                   | —         | no   |
| Spec Review         |  0   | —                   | —         | no   |
+--------------------------------------------------------------------+
| VERDICT: BLOCKED — Prototype Test not yet run                       |
+====================================================================+
```

Required gates for engineering handoff: Problem Framing, Assumption Audit, CPO Review, and Prototype Test. Stakeholder Review and Spec Review are strongly recommended but not blocking.

## Completion status

Every skill ends with one of:
- **DONE** — All steps completed. Evidence provided.
- **DONE_WITH_CONCERNS** — Completed, but with issues. List each concern.
- **BLOCKED** — Cannot proceed. State what's blocking and what was tried.
- **NEEDS_CONTEXT** — Missing information. State exactly what you need.

It is always OK to stop and say "this is too hard" or "I'm not confident in this result."

## Building PMStack — implementation notes

### What to fork from gstack

Copy these directories/files directly from gstack, renaming `gstack` → `pmstack` in paths:
- `bin/` — config management, session tracking, update checking, slug generation, review logging
- `lib/` — shared utilities
- `browse/` — persistent Chromium binary and SKILL.md
- `setup-browser-cookies/` — cookie import SKILL.md
- `setup` — install script (update paths)
- `SKILL.md.tmpl` — shared preamble template (update branding, keep AskUserQuestion format, session tracking, completeness principle)
- `scripts/` — build scripts for gen-skill-docs
- `package.json` — dependencies (Playwright, Bun)

### What to adapt from gstack

These gstack skills need 40-70% rewrite — keep the structure, replace the content:
- `office-hours/` → rewrite with 4 PM modes and Thoughtful Execution integration
- `plan-ceo-review/` → becomes `plan-stakeholder-review/` (multi-lens review)
- `plan-eng-review/` → becomes `spec-review/` (PRD quality audit)
- `retro/` → becomes `post-launch-review/` (product launch retrospective)
- `review/` → reference for findings format and auto-fix patterns

### What to build new

These skills have no gstack equivalent — author from scratch using gstack template patterns:
- `problem-framing/` — follow office-hours phase structure
- `assumption-audit/` — follow review findings format
- `cpo-review/` — adapt from plan-ceo-review structure, add web search research phase
- `prototype/` — new skill, integrates with browse binary for screenshots
- `prioritisation/` — follow plan-ceo-review multi-mode pattern
- `trade-off-analysis/` — use AskUserQuestion heavily for decision capture
- `metrics-review/` — follow qa systematic checking pattern
- `competitive-intel/` — use browse infrastructure + web search
- `comms-draft/` — lightweight writing assistant with PM-specific templates
- `roadmap-review/` — follow review structural audit pattern

### What to remove from gstack

These engineering-only skills are not needed:
- `ship/`, `land-and-deploy/`, `canary/` — deployment pipeline
- `qa/`, `qa-only/` — code-level QA
- `design-review/`, `design-consultation/` — visual design auditing
- `cso/` — security review
- `codex/` — replaced by `/cpo-review`
- `careful/`, `freeze/`, `guard/`, `unfreeze/` — code safety guardrails
- `document-release/` — release documentation
- `benchmark/` — performance benchmarking
- `investigate/` — debugging
- `autoplan/` — replaced by PM-specific flow

### Expert content strategy

`/cpo-review` does NOT use a pre-built knowledge base or local content archive. Instead it uses targeted web search at review time to find relevant expert content from practitioners like Lenny Rachitsky, Marty Cagan (SVPG), Teresa Torres, Shreyas Doshi, and others. This avoids licensing issues with content archives and ensures the agent always finds the most current thinking.

The agent derives search queries from the Product Brief's specific domain, problem pattern, user segment, and product stage. It looks for case studies, relevant frameworks, counter-examples, and expert perspectives. Results are woven into the CPO's own reasoning, not presented as a separate "expert says" pass.

This approach is resilient. If a search doesn't return useful results for a niche domain, the CPO persona still has strong opinions from first principles. The web research enriches the review but doesn't define it.

### SKILL.md template conventions

Every skill template (`SKILL.md.tmpl`) follows this structure:

```markdown
# /skill-name

{{PREAMBLE}}

## Role
[One paragraph defining who this specialist is and their expertise]

## When to use
[Trigger conditions — when should a PM invoke this skill]

## Phases
[Numbered phases with specific steps, questions, and outputs]

## Output format
[Exact structure of the artifact this skill produces]

## Downstream connections
[Which skills read this skill's output, and what they look for]

## Completion
[Status protocol + next skill recommendations]
```

The `{{PREAMBLE}}` placeholder is replaced at build time with the shared preamble from `SKILL.md.tmpl`, which includes session tracking, AskUserQuestion format, Thoughtful Execution principles, and tone guidelines.

### Config

User preferences in `~/.pmstack/config.yaml`:

```yaml
# Proactive skill suggestions (default: true)
proactive: true

# Default prototype tool
prototype_tool: figma-make  # or: html, artifact

# Required gates for handoff (default: all true)
gates:
  problem_framing: true
  assumption_audit: true
  cpo_review: true
  prototype_test: true
```
