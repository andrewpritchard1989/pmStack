# PMStack

PMStack turns Claude Code into a team of product management specialists. Each skill is a slash command that gives Claude a defined role, a structured methodology, and opinionated output formats. Skills chain together — the Product Brief from `/pm-office-hours` is automatically discovered by `/pm-cpo-review`, which feeds into `/pm-prototype`, which feeds into `/pm-spec-review`.

The sprint process: **Discover → Define → Validate → Decide → Specify → Handoff**

PMStack is a fork of [gstack](https://github.com/garrytan/gstack). It preserves gstack's infrastructure (preamble system, session tracking, config management, browse binary) and replaces its engineering-focused skills with product management equivalents.

---

## Skills

| Skill | What it does |
|---|---|
| `/pm-office-hours` | Entry point. Product discovery session with 4 modes: New Feature, Optimisation, Research, Strategy. |
| `/pm-problem-framing` | Deep problem decomposition — customer segments, jobs-to-be-done, pain severity, opportunity sizing. |
| `/pm-assumption-audit` | Extract every assumption, rate risk, and design tests for the high-risk ones. |
| `/pm-cpo-review` | Chief Product Officer challenge — 6-test review + targeted web research. Delivers a verdict. |
| `/pm-prototype` | Auto-drafts a test plan from all prior artifacts, then generates a Figma Make prompt, HTML prototype, or React artifact. |
| `/pm-plan-stakeholder-review` | Simulates engineering, design, and business perspectives. Surfaces cross-stakeholder conflicts. |
| `/pm-spec-review` | PRD quality audit — user stories, acceptance criteria, edge cases, success metrics, dependencies. |
| `/pm-prioritisation` | Multi-framework scoring: ICE, RICE, opportunity scoring, cost of delay. |
| `/pm-trade-off-analysis` | Structured analysis for genuine trade-offs. Heavy use of AskUserQuestion to capture the decision. |
| `/pm-metrics-review` | Measurement plan audit — proxy metrics, baselines, counter-metrics, statistical significance. |
| `/pm-roadmap-review` | Roadmap integrity check — alignment, dependencies, capacity realism. |
| `/pm-competitive-intel` | Competitive landscape analysis using the `/browse` real browser. |
| `/pm-comms-draft` | Product communication writer — launch announcements, internal updates, changelogs, emails. |
| `/pm-post-launch-review` | Post-launch analysis — hypothesis validation, what was learned, what comes next. |
| `/pm-qbr-context` | Start here for QBR prep. Context gathering and audience profiling. |
| `/pm-qbr-narrative` | Build the narrative arc connecting team work to company goals. |
| `/pm-qbr-stress-test` | Simulate executive reactions to your QBR narrative before the real meeting. |
| `/pm-qbr-red-team` | Adversarial review — find weaknesses, misleading claims, and unanswered questions. |
| `/pm-qbr-generate` | Produce the final deliverable: slide outline, exec memo, or speaker script. |
| `/browse` | Persistent Chromium browser for authenticated research and prototype review. |
| `/setup-browser-cookies` | Import browser sessions so `/browse` can access authenticated pages. |

---

## Data privacy

Everything shared with PMStack skills — initiative details, metrics, team context, strategic plans, QBR content — is sent to Anthropic's servers to generate responses. PMStack itself stores all artifacts locally in `~/.pmstack/` and does not transmit them anywhere. The API call to Claude is what carries your data.

**Account types and data retention:**

| Account | Data used for training? | Recommended for confidential work? |
|---|---|---|
| Claude.ai Free / Pro | Yes, by default | No |
| Claude for Work | No (zero retention by default) | Yes |
| Claude.ai Enterprise | No (zero retention by default) | Yes |
| API key (direct) | No, by default | Yes |

If you are on a Free or Pro account and your initiative contains confidential information, describe the problem in general terms rather than pasting internal metrics, unreleased product names, or company-specific strategy verbatim.

See [anthropic.com/privacy](https://anthropic.com/privacy) for current policy details.

---

## Prerequisites

- **[Claude Code](https://claude.ai/code)** — the CLI or desktop app
- **[Bun](https://bun.sh)** v1.0 or later

```bash
# Install Bun if you don't have it
curl -fsSL https://bun.sh/install | bash
```

---

## Installation

Clone PMStack into your Claude Code skills directory and run the setup script. The setup script builds the browse binary, installs Playwright's Chromium browser, creates the `~/.pmstack/` state directory, and registers all skills as slash commands.

```bash
cd ~/.claude/skills
git clone https://github.com/andrewpritchard1989/pmStack pmstack
cd pmstack
./setup
```

Setup takes 2-3 minutes on first run (Playwright's Chromium download). Subsequent runs are fast — it only rebuilds if sources have changed.

Once installed, all skills are available as slash commands in any Claude Code session.

### Project-local install

To install PMStack scoped to a single project (skills available only when Claude Code is run from that directory):

```bash
cd /your/project
git clone https://github.com/andrewpritchard1989/pmStack .pmstack
cd .pmstack
./setup --local
```

### Team install

To keep PMStack automatically up to date across a team, run setup with the `--team` flag. This installs a `SessionStart` hook in `~/.claude/settings.json` so PMStack pulls the latest version every time Claude Code opens a new session:

```bash
cd ~/.claude/skills/pmstack
./setup --team
```

Share this command with teammates — each person runs it once on their own machine. Version drift across the team is eliminated without any manual upgrade steps.

### Cursor support

If [Cursor](https://cursor.com) is installed, setup automatically detects it and generates Cursor-compatible skill files at `~/.cursor/skills/pmstack/`. These are stripped-down versions of the Claude skills — bash preamble removed, frontmatter reduced to `name` and `description` — suitable for Cursor's context system.

### Upgrading

```bash
cd ~/.claude/skills/pmstack
git pull
./setup
```

---

## Usage

### Starting a session

Always start with `/pm-office-hours`. It asks what you are working on and selects the right mode.

```
/pm-office-hours
```

### Skill flows by mode

PMStack organises its skills into four flows depending on what kind of product work you are doing.

#### New Feature

Building a net-new capability. The full flow is required for engineering handoff.

```
/pm-office-hours → /pm-problem-framing → /pm-assumption-audit
→ /pm-cpo-review → /pm-prototype → DECISION GATE
→ /pm-plan-stakeholder-review → /pm-spec-review → Engineering Handoff
```

**Required gates before engineering handoff:** Problem Framing, Assumption Audit, CPO Review, Prototype Test.

#### Optimisation

Improving a metric or experience that already exists.

```
/pm-office-hours → /pm-metrics-review → /pm-cpo-review
→ /pm-trade-off-analysis → /pm-prototype → Engineering Handoff
→ /pm-post-launch-review  (after the experiment)
```

#### Research

Exploring a problem space before committing to a direction.

```
/pm-office-hours → /pm-cpo-review
→ FORK: user interviews OR /pm-prototype (concept test)
→ /pm-competitive-intel (optional) → Synthesis
→ feeds into New Feature or Optimisation mode
```

#### Strategy

Portfolio-level thinking — prioritisation, sequencing, roadmap decisions.

```
/pm-office-hours → /pm-cpo-review → /pm-prioritisation
→ /pm-roadmap-review → /pm-comms-draft
→ Break into initiatives → each runs New Feature mode
```

#### QBR

Preparing a quarterly business review. Two paths depending on whether you're starting fresh or already have a draft.

**Full cycle (starting from scratch):**

```
/pm-qbr-context → /pm-qbr-narrative → /pm-metrics-review
→ /pm-qbr-stress-test → /pm-qbr-red-team → REVISION LOOP
→ /pm-qbr-generate → Final Deliverable
```

**Quick path (existing deck or doc):**

```
Upload deck/doc → /pm-qbr-stress-test → /pm-qbr-red-team
→ REVISION LOOP → /pm-qbr-generate → Final Deliverable
```

### Invoking a skill directly

Every skill can be invoked as a one-off without running the full flow. Skills that require upstream artifacts (like `/pm-cpo-review` needing a Product Brief) will tell you what is missing and ask you to run the prerequisite skill first.

```
/pm-cpo-review
/pm-assumption-audit
/pm-metrics-review
/pm-competitive-intel
```

Skills that do not depend on upstream artifacts can always be run standalone:

```
/pm-trade-off-analysis    # bring your own decision context
/pm-comms-draft           # bring your own launch brief or context
/pm-roadmap-review        # bring your own roadmap document
/pm-prioritisation        # bring your own list of initiatives
```

---

## How it works

### Artifacts

All artifacts are written to `~/.pmstack/` and automatically discovered by downstream skills. You do not need to pass files between skills manually.

```
~/.pmstack/
├── initiatives/        # Product Briefs, TE trees, prototype specs, test results
├── reviews/            # CPO reviews, stakeholder reviews
├── specs/              # Polished specs from /pm-spec-review
├── research/           # Research briefs, interview guides, findings
├── competitive/        # Competitive analysis reports
├── retros/             # Post-launch review snapshots
├── qbrs/               # QBR artifacts (context, narrative, stress test, red team, output)
├── sessions/           # Active session tracking
├── analytics/          # Local skill usage log (JSONL)
└── config.yaml         # User preferences
```

Artifact naming follows the pattern `{slug}-{branch}-{type}-{datetime}.md`, where `slug` is derived from your git repository name and `branch` is the current git branch. This means each initiative and branch gets its own set of artifacts.

### Review Readiness Dashboard

Every review skill (`/pm-problem-framing`, `/pm-assumption-audit`, `/pm-cpo-review`, `/pm-prototype`) logs its result. At the end of each review, a dashboard is rendered showing gate status for engineering handoff:

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

### The Thoughtful Execution framework

New Feature and Optimisation modes use the [Thoughtful Execution](https://anninakoskinen.com/project/thoughtful-execution) framework to prevent jumping from a goal to a single solution. Every initiative produces a TE tree:

```
Goal (measurable metric)
├── Data & Insights
├── Opportunity Mountain A
│   ├── Hypothesis A1
│   │   ├── Solution Design A1a
│   │   └── Solution Design A1b
│   └── Hypothesis A2
└── Opportunity Mountain B
    └── Hypothesis B1
```

The TE tree is a living artifact — updated after every prototype test, experiment, and post-launch review.

---

## Configuration

Edit `~/.pmstack/config.yaml` to adjust defaults:

```yaml
# Proactive skill suggestions (default: true)
# Set to false to disable automatic skill suggestions mid-conversation
proactive: true

# Default prototype tool: figma-make | html | artifact
prototype_tool: figma-make

# Required gates for engineering handoff (default: all true)
gates:
  problem_framing: true
  assumption_audit: true
  cpo_review: true
  prototype_test: true
```

Read or set individual config values from the terminal:

```bash
~/.claude/skills/pmstack/bin/pmstack-config get proactive
~/.claude/skills/pmstack/bin/pmstack-config set prototype_tool html
```

---

## Building from source

The SKILL.md files in each skill directory are generated from `.tmpl` templates. If you edit a template, regenerate:

```bash
cd ~/.claude/skills/pmstack
bun run gen:skill-docs            # Claude only (default, committed to repo)
bun run gen:skill-docs:cursor     # Cursor only
bun run gen:skill-docs:all        # All non-Claude hosts
```

Validate all generated Claude files:

```bash
bun run skill:check
```

Build everything (skill docs + browse binary):

```bash
bun run build
```

To add support for a new host platform, see [ARCHITECTURE.md](ARCHITECTURE.md#multi-host-support).

---

## Project philosophy

PMStack is opinionated about what good product management looks like. The full set of principles is in [ETHOS.md](ETHOS.md). The short version:

- Complete analysis is cheap with AI. There is no excuse for shortcuts in discovery.
- Research before deciding. Find the conventional wisdom before challenging it.
- Evidence over intuition. Treat your intuition as a hypothesis to test.
- The user's words beat the PM's hypothesis. Follow the workaround.
- Narrow wedges, not full platforms. The first version validates one hypothesis.
- Shipping is not success until users get real value.

---

## Further reading

- [ETHOS.md](ETHOS.md) — the product philosophy behind PMStack
- [ARCHITECTURE.md](ARCHITECTURE.md) — build pipeline, resolver system, preamble tiers, how to add a skill
- [CLAUDE.md](CLAUDE.md) — full spec and implementation notes

---

## License

MIT
