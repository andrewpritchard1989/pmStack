# PMStack Implementation Plan

## Context

PMStack is a product management toolkit that forks [gstack](https://github.com/garrytan/gstack)'s infrastructure (build system, preamble engine, CLI utilities, browser integration) and replaces its engineering-focused skills with PM equivalents. The repo currently contains only `CLAUDE.md` (the full spec). This plan delivers the system in phases following the New Feature skill flow, with testing at the end of each phase.

---

## Phase 1: Infrastructure Fork (Foundation)

**Goal**: Clone gstack, copy infrastructure, rename everything, get the build system producing SKILL.md from templates.

### 1.1 Clone gstack as reference
- Clone `https://github.com/garrytan/gstack` to `/tmp/gstack-ref/` as a read-only reference

### 1.2 Copy and rename infrastructure files

| Source (gstack) | Destination (pmstack) | Changes needed |
|---|---|---|
| `bin/gstack-config` | `bin/pmstack-config` | Rename all `gstack` refs, `~/.gstack` -> `~/.pmstack` |
| `bin/gstack-slug` | `bin/pmstack-slug` | Rename env vars `GSTACK_` -> `PMSTACK_` |
| `bin/gstack-review-log` | `bin/pmstack-review-log` | Rename paths |
| `bin/gstack-telemetry-log` | `bin/pmstack-telemetry-log` | Rename paths |
| `bin/gstack-update-check` | `bin/pmstack-update-check` | Rename paths |
| `lib/worktree.ts` | `lib/worktree.ts` | Rename refs (keep for compatibility) |
| `browse/` (entire dir) | `browse/` | Inherited as-is |
| `setup-browser-cookies/` | `setup-browser-cookies/` | Inherited as-is |
| `scripts/gen-skill-docs.ts` | `scripts/gen-skill-docs.ts` | Remove engineering resolvers, hardcode Claude host |
| `scripts/discover-skills.ts` | `scripts/discover-skills.ts` | Rename refs |
| `scripts/skill-check.ts` | `scripts/skill-check.ts` | Rename refs |
| `scripts/resolvers/*` | `scripts/resolvers/*` | See 1.3 below |
| `package.json` | `package.json` | Rename to pmstack, simplify scripts |
| `setup` | `setup` | Major adaptation (see 1.5) |
| `.gitignore` | `.gitignore` | Copy as-is |
| `VERSION` | `VERSION` | Set to `0.1.0` |

### 1.3 Adapt the resolver system

**Keep** (with gstack -> pmstack renames):
- `scripts/resolvers/preamble.ts` -- major rewrite (see 1.4)
- `scripts/resolvers/browse.ts` -- COMMAND_REFERENCE, SNAPSHOT_FLAGS, BROWSE_SETUP
- `scripts/resolvers/utility.ts` -- SLUG_EVAL, SLUG_SETUP, BASE_BRANCH_DETECT
- `scripts/resolvers/types.ts` -- HOST_PATHS (update to pmstack paths)
- `scripts/resolvers/index.ts` -- strip engineering resolvers, register PM resolvers

**Remove entirely**:
- `scripts/resolvers/design.ts` -- all design methodology resolvers
- `scripts/resolvers/testing.ts` -- all test coverage/triage resolvers
- `scripts/resolvers/review.ts` -- all code review resolvers
- `scripts/resolvers/codex-helpers.ts` -- Codex host support (defer)

**Create new**:
- `scripts/resolvers/pm-utility.ts` -- INITIATIVE_SAVE, INITIATIVE_DISCOVER, REVIEW_READINESS_DASHBOARD resolvers
- `scripts/resolvers/pm-frameworks.ts` -- TE_TREE_TEMPLATE, CPO_CHALLENGE_FRAMEWORK, ASSUMPTION_MAP_TEMPLATE resolvers

### 1.4 Rewrite the preamble for PM context

The preamble (`scripts/resolvers/preamble.ts`) is ~520 lines generating session tracking, voice, and principles. Key rewrites:

| Section | gstack | pmstack |
|---|---|---|
| Paths | `~/.gstack`, `gstack-*` bins | `~/.pmstack`, `pmstack-*` bins |
| Voice | Garry Tan/YC founder voice | PM product leader voice ("Direct, concrete, challenging") |
| AskUserQuestion | Generic format | PM format: Re-ground / Simplify / Recommend / Options |
| Completeness | "Boil the Lake" | Thoroughness Principle (complete analysis is cheap with AI) |
| Skill suggestions | Engineering skill list | PM skill list (14 skills) |
| Remove | Contributor mode, Codex sections, engineering escalation | -- |

### 1.5 Adapt setup script

- Rename all `gstack` -> `pmstack` in paths and messages
- Create `~/.pmstack/` with subdirectories: `initiatives/`, `reviews/`, `specs/`, `research/`, `competitive/`, `retros/`, `sessions/`, `analytics/`
- Create default `~/.pmstack/config.yaml` with PMStack defaults
- Keep browse binary build and Playwright setup
- Remove Codex/Kiro host support (Claude-only initially)
- Update symlink logic to `~/.claude/skills/pmstack/`

### 1.6 Create root SKILL.md.tmpl

The shared preamble skill with PM skill suggestions and browse setup reference.

### Phase 1 Testing

| Test | Command/Action | Expected Result |
|---|---|---|
| Build system | `bun run gen:skill-docs` | Root `SKILL.md` generated, no `{{...}}` remaining |
| Config CLI | `pmstack-config set test_key value && pmstack-config get test_key` | Reads/writes `~/.pmstack/config.yaml` |
| Slug detection | `eval "$(bin/pmstack-slug)"` | Outputs SLUG and BRANCH vars |
| Setup script | `./setup` | Browse builds, `~/.pmstack/` dirs created, symlinks in `~/.claude/skills/pmstack/` |
| Freshness check | `bun run gen:skill-docs --dry-run` | All SKILL.md files report FRESH |

---

## Phase 2: `/pm-office-hours` -- Discovery Session

**Goal**: First PM skill, the entry point for all flows. 4 modes with Thoughtful Execution integration.

### Deliverables
- `office-hours/SKILL.md.tmpl` (~70% rewrite of gstack's office-hours)
- INITIATIVE_SAVE resolver wired up

### Key design decisions
- **4 modes** via AskUserQuestion at start: New Feature, Optimisation, Research, Strategy
- **New Feature mode**: Walks PM through Goal -> Data -> Opportunities -> Hypotheses -> Solutions (TE tree)
- **Optimisation mode**: Starts with current metrics and target, builds hypothesis around improvement levers
- **Research mode**: Hypothesis generation, interview guide drafting
- **Strategy mode**: Portfolio-level, multiple initiatives, prioritisation framing
- **Output**: Product Brief + TE tree (New Feature/Optimisation) saved to `~/.pmstack/initiatives/{slug}-{branch}-brief-{datetime}.md`
- **Remove** from gstack: YC forcing questions, Phase 2.75 web search, CODEX_SECOND_OPINION, design mockup placeholders

### Phase 2 Testing

| Test | Command/Action | Expected Result |
|---|---|---|
| Structural | `bun run gen:skill-docs` | `office-hours/SKILL.md` builds, no unresolved placeholders |
| Sections | Read generated SKILL.md | Contains: Role, When to use, Phases, Output format, Downstream connections, Completion |
| Dry-run | Invoke `/pm-office-hours` with "Mobile checkout abandonment is 68%" | Mode selection prompt, walks through questions, produces Product Brief |
| Artifact | Check `~/.pmstack/initiatives/` | Brief saved with correct `{slug}-{branch}-brief-{datetime}.md` naming |
| TE tree | New Feature mode | TE tree artifact also saved |

---

## Phase 3: `/pm-problem-framing` -- Deep Problem Decomposition

**Goal**: New skill (no gstack equivalent). Deep problem decomposition and segment definition.

### Deliverables
- `problem-framing/SKILL.md.tmpl`
- INITIATIVE_DISCOVER resolver (finds upstream artifacts)

### Key design decisions
- Reads Product Brief from `~/.pmstack/initiatives/`
- Phases: customer segment definition, jobs-to-be-done mapping, pain severity rating, opportunity sizing
- Output: Problem Frame to `~/.pmstack/initiatives/{slug}-{branch}-problem-frame-{datetime}.md`
- Feeds into: `/pm-assumption-audit`

### Phase 3 Testing

| Test | Command/Action | Expected Result |
|---|---|---|
| Structural | `bun run gen:skill-docs` | Builds correctly |
| Discovery | Invoke after Phase 2 artifacts exist | Finds and reads Product Brief |
| Output | Check `~/.pmstack/initiatives/` | Problem Frame saved with correct naming |

---

## Phase 4: `/pm-assumption-audit` -- Risk & Assumption Mapping

**Goal**: New skill. Extract, rate, and design tests for every assumption.

### Deliverables
- `assumption-audit/SKILL.md.tmpl`

### Key design decisions
- Reads: Product Brief + Problem Frame
- 4 assumption categories: value, usability, feasibility, viability
- Risk rating: high/medium/low with justification
- Test design for each high-risk assumption
- Output: Assumption Map to `~/.pmstack/initiatives/{slug}-{branch}-assumption-map-{datetime}.md`
- Feeds into: `/pm-cpo-review`, `/pm-prototype`

### Phase 4 Testing

| Test | Command/Action | Expected Result |
|---|---|---|
| Structural | `bun run gen:skill-docs` | Builds correctly |
| Chain | Invoke after Phase 2+3 artifacts | Discovers Brief + Problem Frame |
| Content | Review output | Has categorised assumptions, risk ratings, test designs |
| Output | Check `~/.pmstack/initiatives/` | Assumption Map saved correctly |

---

## Phase 5: `/pm-cpo-review` -- Chief Product Officer Review

**Goal**: The most complex PM skill. Two-phase review: pure reasoning then web research. Adapted from gstack's `plan-ceo-review`.

### Deliverables
- `cpo-review/SKILL.md.tmpl` (~60% rewrite of plan-ceo-review)
- REVIEW_READINESS_DASHBOARD resolver completed
- CPO_CHALLENGE_FRAMEWORK resolver

### Key design decisions
- **Phase 1 (thinking)**: Reads all upstream artifacts. Challenges via 6 tests: Value, Discovery, Scope, Strategic fit, Assumption, TE tree. Delivers verdict (strong conviction / conditional / rethink / kill).
- **Phase 2 (research)**: Targeted WebSearch derived from Brief's domain, problem pattern, user segment. Finds case studies, frameworks, counter-examples, expert perspectives. Weaves into existing reasoning.
- **Output**: CPO Review Report to `~/.pmstack/reviews/{slug}-{branch}-cpo-review-{datetime}.md`
- **Review Readiness Dashboard**: Rendered at end of review showing gate status
- Feeds into: `/pm-prototype`, `/pm-plan-stakeholder-review`

### Phase 5 Testing

| Test | Command/Action | Expected Result |
|---|---|---|
| Structural | `bun run gen:skill-docs` | Builds with PREAMBLE, BASE_BRANCH_DETECT, BROWSE_SETUP resolved |
| Phase 1 | Invoke with upstream artifacts | Challenge produced without web search |
| Phase 2 | Continue to research phase | Web searches executed, evidence woven in |
| Verdict | Review output | Clear verdict with top 2-3 unconsidered concerns |
| Dashboard | End of review | Review Readiness Dashboard renders correctly |
| Output | Check `~/.pmstack/reviews/` | CPO Review Report saved |

---

## Phase 6: `/pm-prototype` -- Build & Test with Customers

**Goal**: New skill. Generates prototypes and auto-drafts test plans from all prior artifacts.

### Deliverables
- `prototype/SKILL.md.tmpl`

### Key design decisions
- Reads: Brief, TE tree, Assumption Map, CPO Review
- Auto-drafts test plan: CPO challenges become observation criteria, riskiest assumptions become test tasks
- 3 prototype options via AskUserQuestion: Figma Make prompt, HTML prototype, Claude Artifact
- Output: Prototype Spec + Test Results to `~/.pmstack/initiatives/`
- This is the final required gate for engineering handoff

### Phase 6 Testing

| Test | Command/Action | Expected Result |
|---|---|---|
| Structural | `bun run gen:skill-docs` | Builds, no unresolved placeholders |
| Artifact chain | Invoke with all upstream artifacts | Discovers and reads all 4 upstream artifacts |
| Test plan | Review auto-drafted plan | CPO challenges appear as criteria, assumptions as tasks |
| Figma Make mode | Select option A | Structured prompt suitable for Figma Make |
| HTML mode | Select option B | Working HTML files generated locally |
| Output | Check `~/.pmstack/initiatives/` | Prototype spec and test results saved |

---

## Phase 7: `/pm-plan-stakeholder-review` + `/pm-spec-review` -- Final New Feature Flow Skills

**Goal**: Complete the New Feature flow with the two recommended-but-not-blocking skills.

### 7.1 `/pm-plan-stakeholder-review`
- Adapted from `plan-ceo-review` structure (multi-lens instead of single lens)
- Simulates 3 perspectives: Engineering lead, Design lead, Business/revenue lead
- Cross-stakeholder conflict identification
- Output: `~/.pmstack/reviews/{slug}-{branch}-stakeholder-review-{datetime}.md`

### 7.2 `/pm-spec-review`
- Adapted from `plan-eng-review` structure (PRD audit instead of eng architecture)
- Systematic audit: user stories, acceptance criteria, edge cases, success metrics, dependencies, scope boundaries
- Interactive resolution via AskUserQuestion
- Output: Polished spec to `~/.pmstack/specs/`

### Phase 7 Testing

| Test | Command/Action | Expected Result |
|---|---|---|
| Structural (both) | `bun run gen:skill-docs` | Both build correctly |
| Stakeholder lenses | Invoke stakeholder review | All 3 perspectives present, conflicts identified |
| Spec audit | Invoke spec review with a draft PRD | All checklist items covered |
| Dashboard | After both run | Dashboard shows full New Feature flow complete |
| **New Feature E2E** | Run complete 7-skill flow | All skills chain correctly, all artifacts discoverable |

---

## Phase 8: Remaining Mode Skills

**Goal**: Build the 7 skills needed for Optimisation, Research, and Strategy flows.

| Skill | Tier | Key input | Output location | Notes |
|---|---|---|---|---|
| `prioritisation` | 2 | Multiple initiative briefs | `~/.pmstack/initiatives/` | ICE, RICE, opportunity, cost of delay frameworks |
| `trade-off-analysis` | 2 | Decision context | `~/.pmstack/initiatives/` | Heavy AskUserQuestion for decision capture |
| `metrics-review` | 2 | Measurement plan | `~/.pmstack/analytics/` | Proxy metrics, baselines, counter-metrics, stat sig |
| `roadmap-review` | 2 | Roadmap document | `~/.pmstack/reviews/` | Alignment, dependencies, capacity realism |
| `competitive-intel` | 2 | Product domain | `~/.pmstack/competitive/` | Uses BROWSE_SETUP for web research |
| `comms-draft` | 2 | Launch brief or context | stdout (ephemeral) | Templates: launch, internal update, changelog, email |
| `post-launch-review` | 2 | Launch data + prior artifacts | `~/.pmstack/retros/` | Adapted from gstack's retro skill |

### Phase 8 Testing

| Test | Command/Action | Expected Result |
|---|---|---|
| Structural (all 7) | `bun run gen:skill-docs` | All build, no unresolved placeholders |
| Frontmatter (all 7) | Validate each | name, preamble-tier, version, description, allowed-tools present |
| Sections (all 7) | Read each SKILL.md | Role, When to use, Phases, Output format, Downstream connections, Completion |
| Artifact paths (all 7) | Check output references | Each writes to correct `~/.pmstack/` subdirectory |
| Optimisation flow | office-hours (opt) -> metrics-review -> cpo-review -> trade-off-analysis -> prototype | Full chain works |
| Strategy flow | office-hours (strategy) -> cpo-review -> prioritisation -> roadmap-review -> comms-draft | Full chain works |

---

## Phase 9: Documentation

**Goal**: Author ETHOS.md and ARCHITECTURE.md.

### 9.1 `ETHOS.md`
Adapted from gstack's ETHOS.md. Replace engineering principles with PM equivalents:

| gstack principle | pmstack equivalent |
|---|---|
| "Boil the Lake" | "Thoroughness Principle" -- complete analysis is cheap with AI |
| "Search Before Building" | "Research Before Deciding" -- understand conventional wisdom, then challenge it |
| (new) | "Evidence over intuition" |
| (new) | "The user's words beat the PM's hypothesis" |
| (new) | "Narrow wedges, not full platforms" |
| (new) | "Multiple hypotheses per opportunity" |

### 9.2 `ARCHITECTURE.md`
Document the full system:
- Build pipeline (templates -> resolvers -> SKILL.md)
- Preamble tier system and skill-tier assignments
- Artifact filesystem layout (`~/.pmstack/`)
- Skill flow diagrams (all 4 modes)
- Resolver registration pattern
- How to add a new skill
- Testing approach

### Phase 9 Testing

| Test | Command/Action | Expected Result |
|---|---|---|
| Link validation | Check all file paths referenced in docs | All referenced files exist |
| Completeness | Review ARCHITECTURE.md | Covers every resolver, skill, and artifact path |
| Consistency | Cross-reference with CLAUDE.md | No contradictions between spec and docs |

---

## Phase 10: End-to-End Integration Testing

**Goal**: Validate the complete system works as a cohesive toolkit.

### 10.1 New Feature Flow E2E
Run the full chain with sample initiative "Reduce checkout abandonment in mobile marketplace app":
1. `/pm-office-hours` (New Feature) -> Product Brief + TE tree
2. `/pm-problem-framing` -> Problem Frame (discovers Brief)
3. `/pm-assumption-audit` -> Assumption Map (discovers Brief + Frame)
4. `/pm-cpo-review` -> CPO Review (discovers all above)
5. `/pm-prototype` -> Prototype Spec + Test Plan (discovers all above)
6. `/pm-plan-stakeholder-review` -> Stakeholder Review
7. `/pm-spec-review` -> Polished Spec

**Verify**: Each skill discovers upstream artifacts. Dashboard updates. Completion status reported.

### 10.2 Cross-Flow Integration
- `/pm-prioritisation` reads multiple briefs
- `/pm-competitive-intel` uses browse correctly
- `/pm-post-launch-review` reads prior launch artifacts

### 10.3 Build System Validation
- `bun run gen:skill-docs --dry-run` -> all FRESH
- `bun run skill:check` -> all pass
- `./setup` on clean state -> completes successfully

### 10.4 Automated Test Suite
Create `test/` directory:
- `test/gen-skill-docs.test.ts` -- all templates produce valid SKILL.md
- `test/skill-validation.test.ts` -- frontmatter fields, required sections, no unresolved placeholders
- `test/artifact-paths.test.ts` -- each skill references correct `~/.pmstack/` paths

### Phase 10 Testing

| Test | Expected Result |
|---|---|
| New Feature E2E (7 skills) | Complete chain, all artifacts, dashboard shows READY |
| Optimisation E2E (5 skills) | Complete chain |
| Strategy E2E (5 skills) | Complete chain |
| `bun test` | All automated tests pass |
| Clean install | `./setup` succeeds from scratch |

---

## Risk Areas

1. **Browse binary build**: The `browse/` directory has deep internal imports. Copying the entire directory should work, but the build step must compile without modification.
2. **Preamble bash emission**: The rewritten preamble generates bash that runs in skill contexts. Every `$_VAR` reference must be valid.
3. **Artifact discovery patterns**: Skills use `ls -t ~/.pmstack/initiatives/$SLUG-*-brief-*.md | head -1` style globs. Must be consistent across all skills.
4. **Token budget**: Large PM skills (cpo-review, office-hours) could be very long. Monitor gen-skill-docs token count output and trim if needed.

---

## Dependency Graph

```
Phase 1  (Infrastructure)
   |
Phase 2  (/pm-office-hours)
   |
Phase 3  (/pm-problem-framing)
   |
Phase 4  (/pm-assumption-audit)
   |
Phase 5  (/pm-cpo-review)
   |
Phase 6  (/pm-prototype)
   |
Phase 7  (/pm-plan-stakeholder-review + /pm-spec-review)
   |
Phase 8  (7 remaining skills -- can be parallelised)
   |
Phase 9  (ETHOS.md + ARCHITECTURE.md)
   |
Phase 10 (E2E integration testing)
```
