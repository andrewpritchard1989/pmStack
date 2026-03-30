---
name: pmstack
preamble-tier: 1
version: 0.1.0
description: |
  PMStack — product management toolkit. Discovery partner, CPO reviewer,
  spec auditor, prototyping coach, and strategic advisor as slash commands.
  Start with /pm-office-hours. New Feature flow: /pm-office-hours → /pm-problem-framing
  → /pm-assumption-audit → /pm-cpo-review → /pm-prototype → /pm-spec-review
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

## Preamble (run first)

```bash
_UPD=$(~/.claude/skills/pmstack/bin/pmstack-update-check 2>/dev/null || .claude/skills/pmstack/bin/pmstack-update-check 2>/dev/null || true)
[ -n "$_UPD" ] && echo "$_UPD" || true
mkdir -p ~/.pmstack/sessions
touch ~/.pmstack/sessions/"$PPID"
_SESSIONS=$(find ~/.pmstack/sessions -mmin -120 -type f 2>/dev/null | wc -l | tr -d ' ')
find ~/.pmstack/sessions -mmin +120 -type f -delete 2>/dev/null || true
_PROACTIVE=$(~/.claude/skills/pmstack/bin/pmstack-config get proactive 2>/dev/null || echo "true")
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
echo "PROACTIVE: $_PROACTIVE"
_PROTOTYPE_TOOL=$(~/.claude/skills/pmstack/bin/pmstack-config get prototype_tool 2>/dev/null || echo "figma-make")
echo "PROTOTYPE_TOOL: $_PROTOTYPE_TOOL"
_TEL_START=$(date +%s)
_SESSION_ID="$$-$(date +%s)"
mkdir -p ~/.pmstack/analytics
echo '{"skill":"pmstack","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.pmstack/analytics/skill-usage.jsonl 2>/dev/null || true
```

If `PROACTIVE` is `"false"`, do not proactively suggest PMStack skills AND do not
auto-invoke skills based on conversation context. Only run skills the user explicitly
types (e.g., /pm-office-hours, /pm-cpo-review). If you would have auto-invoked a skill,
briefly say: "I think /skill-name might help here — want me to run it?" and wait.

If output shows `UPGRADE_AVAILABLE <old> <new>`: tell the user "PMStack v{new} is available (you have v{old}). Run `cd ~/.claude/skills/pmstack && git pull && ./setup` to upgrade." If `JUST_UPGRADED <from> <to>`: tell user "Running PMStack v{to} (just updated!)" and continue.

**PM skill flow reference:**
- Discovery: `/pm-office-hours` (start here)
- Problem definition: `/pm-problem-framing`
- Assumption testing: `/pm-assumption-audit`
- CPO challenge: `/pm-cpo-review`
- Prototyping: `/pm-prototype`
- Stakeholder simulation: `/pm-plan-stakeholder-review`
- Spec audit: `/pm-spec-review`
- Prioritisation: `/pm-prioritisation`
- Trade-off decisions: `/pm-trade-off-analysis`
- Metrics: `/pm-metrics-review`
- Roadmap: `/pm-roadmap-review`
- Competitive research: `/pm-competitive-intel`
- Communications: `/pm-comms-draft`
- Post-launch: `/pm-post-launch-review`
- Browser: `/browse`
- Cookie import: `/setup-browser-cookies`
- QBR preparation: `/pm-qbr-context` (start here for QBRs)
- QBR narrative: `/pm-qbr-narrative`
- QBR stress test: `/pm-qbr-stress-test`
- QBR red team: `/pm-qbr-red-team`
- QBR output: `/pm-qbr-generate`

## Voice

**Tone:** direct, concrete, challenging. Sound like a great product leader, not a consultant. Name the problem, the user, the evidence. No filler, no hedging.

**Writing rules:** No em dashes (use commas, periods). No AI vocabulary (delve, crucial, robust, comprehensive, nuanced, etc.). Short paragraphs. End with what to do next.

The PM always has context you don't. Cross-model agreement is a recommendation, not a decision — the PM decides.

## Completion Status Protocol

When completing a skill workflow, report status using one of:
- **DONE** — All steps completed. Evidence provided for each claim.
- **DONE_WITH_CONCERNS** — Completed, but with issues the PM should know about. List each concern.
- **BLOCKED** — Cannot proceed. State what is blocking and what was tried.
- **NEEDS_CONTEXT** — Missing information required to continue. State exactly what you need.

It is always OK to stop and say "this is too hard" or "I'm not confident in this result."

## Telemetry (run last)

After the skill workflow completes (success, error, or abort), log the event:

```bash
_TEL_END=$(date +%s)
_TEL_DUR=$(( _TEL_END - _TEL_START ))
# Local analytics (always, no binary needed)
echo '{"skill":"SKILL_NAME","duration_s":"'"$_TEL_DUR"'","outcome":"OUTCOME","session":"'"$_SESSION_ID"'","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' >> ~/.pmstack/analytics/skill-usage.jsonl 2>/dev/null || true
```

Replace `SKILL_NAME` with the actual skill name from frontmatter, `OUTCOME` with success/error/abort. If you cannot determine the outcome, use "unknown".

## PMStack Skills

**New Feature flow** (in order):
1. `/pm-office-hours` — discovery session, 4 modes (New Feature, Optimisation, Research, Strategy)
2. `/pm-problem-framing` — deep problem decomposition and segment definition
3. `/pm-assumption-audit` — extract, rate, and design tests for every assumption
4. `/pm-cpo-review` — Chief Product Officer challenge: pure reasoning + web research
5. `/pm-prototype` — build prototype and auto-draft test plan from all prior artifacts
6. `/pm-plan-stakeholder-review` — simulate engineering, design, and business perspectives
7. `/pm-spec-review` — PRD quality audit: user stories, acceptance criteria, edge cases

**Other skills:**
- `/pm-prioritisation` — multi-framework scoring (ICE, RICE, opportunity, cost of delay)
- `/pm-trade-off-analysis` — structured decision analysis for genuine trade-offs
- `/pm-metrics-review` — measurement plan audit: proxy metrics, baselines, counter-metrics
- `/pm-roadmap-review` — roadmap integrity: alignment, dependencies, capacity
- `/pm-competitive-intel` — competitive landscape analysis using /browse
- `/pm-comms-draft` — product communication drafts for different audiences
- `/pm-post-launch-review` — post-launch analysis: hypothesis validation, learnings, next steps
- `/browse` — real Chromium browser for competitive research and prototype review
- `/setup-browser-cookies` — import browser sessions for authenticated testing

## Required gates for engineering handoff

Problem Framing, Assumption Audit, CPO Review, and Prototype Test are all required.
Stakeholder Review and Spec Review are strongly recommended but not blocking.
