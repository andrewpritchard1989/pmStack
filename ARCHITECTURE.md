# PMStack Architecture

This document describes how PMStack is built — the build pipeline, preamble system, resolver pattern, artifact filesystem, skill flows, and how to add a new skill.

---

## Build pipeline

Every skill in PMStack is defined as a template (`SKILL.md.tmpl`) and compiled to a generated file (`SKILL.md`). The generated files are tracked in git and used directly by Claude Code.

```
SKILL.md.tmpl  →  gen-skill-docs.ts  →  SKILL.md
     +                                        ↑
resolvers/                              [checked into git,
 index.ts                                used by Claude Code]
 preamble.ts
 pm-utility.ts
 pm-frameworks.ts
 browse.ts
 utility.ts
```

**Build command:** `bun run gen:skill-docs`

**Dry-run (CI check):** `bun run gen:skill-docs --dry-run` — exits 1 if any SKILL.md is stale (different from what the template would produce). All SKILL.md files in the repo should always be FRESH.

**Template discovery:** `scripts/discover-skills.ts` finds all `SKILL.md.tmpl` files at root level and one directory deep. It skips `node_modules`, `.git`, `dist`, and dotted directories.

---

## Template format

Every `SKILL.md.tmpl` has a YAML frontmatter block followed by the template body:

```markdown
---
name: skill-name
preamble-tier: 3
version: 0.1.0
description: |
  One paragraph description of what this skill does.
allowed-tools:
  - Bash
  - Read
  - Write
  - AskUserQuestion
  - WebSearch  # only if the skill uses web search
---

{{PREAMBLE}}

# /skill-name

## Role
...
```

**Frontmatter fields:**
- `name` — the skill's identifier, used in telemetry and preamble references
- `preamble-tier` — controls which preamble sections are included (see Preamble tiers below)
- `version` — semver, for upgrade checking
- `description` — used in gen-skill-docs output and skill discovery
- `allowed-tools` — informs the agent which Claude Code tools it can use

**Placeholder syntax:** `{{PLACEHOLDER_NAME}}` — replaced at build time by the corresponding resolver function.

---

## Preamble tiers

The preamble is the shared system instructions that every skill inherits. Its content is controlled by `preamble-tier` in the frontmatter.

```
T1: core bash + upgrade check + voice (trimmed) + completion status
T2: T1 + full voice + AskUserQuestion format + thoroughness principle
T3: T2 + initiative context discovery + research-before-deciding
T4: reserved (same as T3 currently)
```

**Skills by tier:**

| Tier | Skills |
|------|--------|
| T1 | `browse`, `setup-browser-cookies` |
| T2 | `post-launch-review`, `metrics-review`, `trade-off-analysis`, `comms-draft`, `prioritisation`, `roadmap-review`, `qbr-context`, `qbr-narrative`, `qbr-stress-test`, `qbr-red-team`, `qbr-generate` |
| T3 | `office-hours`, `problem-framing`, `assumption-audit`, `cpo-review`, `prototype`, `plan-stakeholder-review`, `spec-review`, `competitive-intel` |

Tier 3 includes the Initiative Context Discovery section in the preamble, which runs bash to find all upstream artifacts (brief, problem frame, assumption map, CPO review, prototype spec) before the skill body begins. This is in addition to any artifact discovery that individual skills do in their own Setup sections.

---

## Resolver pattern

A resolver is a TypeScript function that takes a `TemplateContext` and returns a string. The returned string replaces the `{{PLACEHOLDER}}` in the template.

```typescript
// scripts/resolvers/types.ts
interface TemplateContext {
  skillName: string;
  tmplPath: string;
  benefitsFrom: string[];
  host: string;
  preambleTier: number;
  paths: {
    binDir: string;       // ~/.claude/skills/pmstack/bin
    skillRoot: string;    // ~/.claude/skills/pmstack
    localSkillRoot: string;
  };
}
```

Resolvers are registered in `scripts/resolvers/index.ts`:

```typescript
export const RESOLVERS: Record<string, (ctx: TemplateContext) => string> = {
  PREAMBLE: generatePreamble,
  INITIATIVE_SAVE: generateInitiativeSave,
  INITIATIVE_DISCOVER: generateInitiativeDiscover,
  // ...
};
```

**Available resolvers:**

| Placeholder | File | What it generates |
|-------------|------|-------------------|
| `{{PREAMBLE}}` | `preamble.ts` | Full preamble for the skill's tier |
| `{{SLUG_EVAL}}` | `utility.ts` | Bash to evaluate SLUG and BRANCH |
| `{{SLUG_SETUP}}` | `utility.ts` | SLUG_EVAL + mkdir initiatives dir |
| `{{BASE_BRANCH_DETECT}}` | `utility.ts` | Multi-platform base branch detection |
| `{{CO_AUTHOR_TRAILER}}` | `utility.ts` | Git co-author trailer |
| `{{COMMAND_REFERENCE}}` | `browse.ts` | Full /browse command reference table |
| `{{SNAPSHOT_FLAGS}}` | `browse.ts` | /browse snapshot flag reference |
| `{{BROWSE_SETUP}}` | `browse.ts` | Browse binary setup instructions |
| `{{INITIATIVE_SAVE}}` | `pm-utility.ts` | Bash to set SLUG, BRANCH, DATETIME for saving |
| `{{INITIATIVE_DISCOVER}}` | `pm-utility.ts` | Bash to find and read the current Product Brief |
| `{{REVIEW_READINESS_DASHBOARD}}` | `pm-utility.ts` | Dashboard template + log instructions |
| `{{TE_TREE_TEMPLATE}}` | `pm-frameworks.ts` | TE tree structure and rules |
| `{{CPO_CHALLENGE_FRAMEWORK}}` | `pm-frameworks.ts` | 6-test CPO challenge framework |
| `{{ASSUMPTION_MAP_TEMPLATE}}` | `pm-frameworks.ts` | 4-category assumption map template |

---

## Artifact filesystem layout

All PMStack artifacts are stored in `~/.pmstack/` and automatically discoverable by downstream skills.

```
~/.pmstack/
├── initiatives/
│   ├── {slug}-{branch}-brief-{datetime}.md          # Product Brief (/office-hours)
│   ├── {slug}-{branch}-te-tree-{datetime}.md         # TE Tree (/office-hours)
│   ├── {slug}-{branch}-problem-frame-{datetime}.md   # Problem Frame (/problem-framing)
│   ├── {slug}-{branch}-assumption-map-{datetime}.md  # Assumption Map (/assumption-audit)
│   ├── {slug}-{branch}-prototype-spec-{datetime}.md  # Prototype Spec (/prototype)
│   ├── {slug}-{branch}-test-results-{datetime}.md    # Test Results (/prototype)
│   ├── {slug}-{branch}-prioritisation-{datetime}.md  # Prioritisation (/prioritisation)
│   └── {slug}-{branch}-trade-off-{datetime}.md       # Trade-off (/trade-off-analysis)
├── reviews/
│   ├── {slug}-{branch}-cpo-review-{datetime}.md      # CPO Review (/cpo-review)
│   ├── {slug}-{branch}-stakeholder-review-{datetime}.md  # Stakeholder Review
│   └── {slug}-{branch}-roadmap-review-{datetime}.md  # Roadmap Review
├── specs/
│   └── {slug}-{branch}-spec-{datetime}.md            # Polished Spec (/spec-review)
├── research/                                          # Research artifacts (manual)
├── competitive/
│   └── {slug}-{branch}-competitive-intel-{datetime}.md  # Competitive Intel
├── retros/
│   └── {slug}-{branch}-post-launch-review-{datetime}.md  # Post-launch Review
├── qbrs/
│   ├── {slug}-{branch}-context-{datetime}.md             # QBR Context (/qbr-context)
│   ├── {slug}-{branch}-narrative-{datetime}.md           # QBR Narrative (/qbr-narrative)
│   ├── {slug}-{branch}-stress-test-{datetime}.md         # Stress Test (/qbr-stress-test)
│   ├── {slug}-{branch}-red-team-{datetime}.md            # Red Team (/qbr-red-team)
│   └── {slug}-{branch}-output-{datetime}.md              # Final Output (/qbr-generate)
├── analytics/
│   ├── skill-usage.jsonl                             # Telemetry (local only)
│   └── {slug}-{branch}-measurement-plan-{datetime}.md   # Measurement Plan
├── projects/
│   └── {slug}/
│       └── {branch}-reviews.jsonl                   # Review Readiness log
├── sessions/
│   └── {PPID}                                        # Active session tracking (TTL 120m)
└── config.yaml                                       # User preferences
```

**Slug generation:** `pmstack-slug` derives SLUG from the git remote URL (normalised to lowercase, hyphens only) and BRANCH from the current git branch. This ensures artifact filenames are unique per repo and branch.

**Artifact discovery pattern:** all downstream skills find upstream artifacts with:
```bash
ls -t ~/.pmstack/{dir}/$SLUG-$BRANCH-{artifact-type}-*.md 2>/dev/null | head -1
```

The `-t` flag sorts by modification time, so the most recent artifact is always returned first.

---

## Skill flow diagrams

### New Feature mode
```
/office-hours (new feature)
  → Produces: Brief, TE tree
  ↓
/problem-framing
  → Reads: Brief
  → Produces: Problem Frame
  ↓
/assumption-audit
  → Reads: Brief, Problem Frame
  → Produces: Assumption Map
  ↓
/cpo-review
  → Reads: Brief, Problem Frame, Assumption Map, TE tree
  → Produces: CPO Review Report
  → Updates: Review Readiness Dashboard
  ↓
/prototype
  → Reads: Brief, TE tree, Assumption Map, CPO Review
  → Produces: Prototype Spec, Test Results
  → Updates: Review Readiness Dashboard
  ↓
  [DECISION GATE — all required reviews complete]
  ↓
/plan-stakeholder-review           /spec-review
  → Reads: Brief, CPO Review,         → Reads: Brief, CPO Review,
    Prototype Spec, Test Results         Test Results, Stakeholder Review
  → Produces: Stakeholder Review      → Produces: Polished Spec
  → Updates: Dashboard                → Updates: Dashboard
  ↓
  Engineering Handoff
```

### Optimisation mode
```
/office-hours (optimisation)
  → Produces: Brief with measurement scaffold
  ↓
/metrics-review
  → Reads: Brief
  → Produces: Measurement Plan
  ↓
/cpo-review → /trade-off-analysis → /prototype → /post-launch-review
```

### Research mode
```
/office-hours (research)
  → Produces: Brief with research plan and interview guide
  ↓
/cpo-review (optional, for early challenge)
  ↓
[Run user interviews / usability test]
  ↓
/competitive-intel (optional)
  ↓
Return to /office-hours (New Feature or Optimisation mode) with findings
```

### Strategy mode
```
/office-hours (strategy)
  → Produces: Brief with initiative inventory
  ↓
/cpo-review (portfolio-level challenge)
  ↓
/prioritisation → /roadmap-review → /comms-draft
  ↓
Break into individual initiatives → each runs New Feature mode
```

### QBR mode (full cycle)
```
/qbr-context
  → Produces: QBR Context doc (audience profile, team work summary, decisions needed)
  ↓
/qbr-narrative
  → Reads: QBR Context doc
  → Produces: QBR Narrative arc
  ↓
/metrics-review (QBR pass)
  → Reads: QBR Narrative arc
  → Produces: Metrics Review (QBR)
  ↓
/qbr-stress-test
  → Reads: QBR Narrative arc, Metrics Review
  → Produces: Stress Test report
  ↓
/qbr-red-team
  → Reads: QBR Narrative arc, Stress Test report
  → Produces: Red Team report
  ↓
  [REVISION LOOP — address findings, update narrative, re-run stress test if needed]
  ↓
/qbr-generate
  → Reads: All QBR artifacts
  → Produces: Slide outline, exec memo, and/or speaker script
  → Saves to: ~/.pmstack/qbrs/
```

### QBR mode (quick — existing draft)
```
Upload deck/doc
  ↓
/qbr-stress-test → /qbr-red-team
  ↓
  [REVISION LOOP]
  ↓
/qbr-generate → Final Deliverable
```

---

## Review Readiness Dashboard

The dashboard tracks which required gates have been completed for an initiative. It is rendered at the end of each review skill.

**Required gates for engineering handoff:**
1. Problem Framing
2. Assumption Audit
3. CPO Review
4. Prototype Test

**Strongly recommended (not blocking):**
5. Stakeholder Review
6. Spec Review

**How it works:**
1. Each review skill runs `pmstack-review-log` at completion, appending a JSONL entry to `~/.pmstack/projects/{slug}/{branch}-reviews.jsonl`
2. At the end of each review, the skill runs `pmstack-review-read` to get all review entries for the current initiative
3. The agent parses the JSONL, counts runs per skill, finds the last run timestamp, and renders the table
4. VERDICT: READY if all 4 required gates show at least one DONE run; BLOCKED otherwise

**Review skill name mapping:**

| Dashboard row | Skill name logged |
|--------------|------------------|
| Problem Framing | `problem-framing` |
| Assumption Audit | `assumption-audit` |
| CPO Review | `cpo-review` |
| Prototype Test | `prototype-test` |
| Stakeholder Review | `stakeholder-review` |
| Spec Review | `spec-review` |

---

## How to add a new skill

1. **Create the directory and template:**
   ```
   mkdir my-skill
   touch my-skill/SKILL.md.tmpl
   ```

2. **Write the frontmatter:**
   ```yaml
   ---
   name: my-skill
   preamble-tier: 2  # or 3 if the skill needs initiative discovery
   version: 0.1.0
   description: |
     What this skill does.
   allowed-tools:
     - Bash
     - Read
     - Write
     - AskUserQuestion
   ---
   ```

3. **Choose the right preamble tier:**
   - Tier 2: audit skills, analysis tools, standalone utilities
   - Tier 3: discovery-heavy skills that chain from upstream artifacts

4. **Structure the template body:**
   ```markdown
   {{PREAMBLE}}

   # /my-skill

   ## Role
   ## When to use
   ## Setup          ← use {{INITIATIVE_DISCOVER}} or write inline bash
   ## Phase 1: ...
   ## Phase 2: ...
   ## Output format
   ## Downstream connections
   ## Completion
   ```

5. **Use existing resolvers where applicable:**
   - `{{INITIATIVE_SAVE}}` — for the artifact saving bash block
   - `{{INITIATIVE_DISCOVER}}` — to find and read the current Product Brief
   - `{{REVIEW_READINESS_DASHBOARD}}` — if this skill is a review gate

6. **Build and verify:**
   ```bash
   bun run gen:skill-docs
   bun run gen:skill-docs --dry-run
   grep -c '{{' my-skill/SKILL.md  # should be 0
   ```

7. **Add to the preamble tier comment** in `scripts/resolvers/preamble.ts` so the skill assignment is documented.

8. **Add to the skill list** in `SKILL.md.tmpl` (root preamble) so it appears in the PM skill flow reference.

---

## Testing approach

**Build-time validation** (run before every commit):
- `bun run gen:skill-docs` — all templates build without error
- `bun run gen:skill-docs --dry-run` — all SKILL.md files are FRESH (no stale generated files)
- `grep -c '{{' */SKILL.md` — zero unresolved placeholders in any generated file

**Structural validation** (manual review):
- Every skill has: Role, When to use, at least one Phase, Output format, Downstream connections, Completion
- Every Tier 3 skill has a Setup section with artifact discovery bash
- Every review skill ends with `{{REVIEW_READINESS_DASHBOARD}}`
- Output paths match the filesystem layout in this document

**Token budget monitoring:**
- `bun run gen:skill-docs` prints token estimates per skill
- Skills over 600 lines (~7,000 tokens) should be reviewed for trimming
- The total budget across all skills loaded in a session matters — keep individual skills focused

---

## CLI utilities (bin/)

| Binary | Purpose |
|--------|---------|
| `pmstack-config` | Read/write user preferences in `~/.pmstack/config.yaml` |
| `pmstack-slug` | Derive SLUG (from git remote) and BRANCH (from git branch) |
| `pmstack-review-log` | Append a review result to the initiative's JSONL log |
| `pmstack-review-read` | Read the review log for the current initiative |
| `pmstack-telemetry-log` | Local telemetry (skill usage analytics) |
| `pmstack-update-check` | Check if a newer version of PMStack is available |
| `pmstack-repo-mode` | Detect repository type and characteristics |

All binaries are installed to `~/.claude/skills/pmstack/bin/` by the setup script.
