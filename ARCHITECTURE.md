# PMStack Architecture

This document describes how PMStack is built — the build pipeline, preamble system, resolver pattern, artifact filesystem, skill flows, and how to add a new skill.

---

## Build pipeline

Every skill in PMStack is defined as a template (`SKILL.md.tmpl`) and compiled to generated output files. The Claude (`SKILL.md`) files are tracked in git and used directly by Claude Code. Non-Claude host files (`SKILL.cursor.md` etc.) are generated on the user's machine during setup and gitignored.

```
SKILL.md.tmpl  →  gen-skill-docs.ts  →  SKILL.md           (Claude, committed)
     +                |                  SKILL.cursor.md    (Cursor, gitignored)
resolvers/            ↓
 index.ts         hosts/
 preamble.ts       claude.ts           ← path config, frontmatter rules
 pm-utility.ts     cursor.ts
 pm-frameworks.ts  index.ts            ← host registry
 browse.ts
 utility.ts
```

**Build commands:**

| Command | What it does |
|---------|-------------|
| `bun run gen:skill-docs` | Generate Claude `SKILL.md` files only (default, used in CI) |
| `bun run gen:skill-docs --host cursor` | Generate Cursor `SKILL.cursor.md` files |
| `bun run gen:skill-docs --host all` | Generate all non-Claude host files |
| `bun run gen:skill-docs --dry-run` | Exit 1 if any Claude `SKILL.md` is stale |

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
  benefitsFrom?: string[];
  host: string;           // e.g. 'claude', 'cursor'
  preambleTier?: number;
  paths: {
    binDir: string;       // ~/.claude/skills/pmstack/bin  (or $PMSTACK_BIN for non-Claude)
    skillRoot: string;    // ~/.claude/skills/pmstack      (or $PMSTACK_ROOT)
    localSkillRoot: string;
    browseDir: string;
  };
  hostConfig?: HostConfig; // config for the current host — used for conditional generation
}
```

Resolvers use `ctx.hostConfig` to conditionally suppress content for non-Claude hosts. For example, `generatePreamble` in `preamble.ts` skips all bash execution blocks when `ctx.hostConfig.name !== 'claude'`.

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
│   ├── {slug}-{branch}-brief-{datetime}.md          # Product Brief (/pm-office-hours)
│   ├── {slug}-{branch}-te-tree-{datetime}.md         # TE Tree (/pm-office-hours)
│   ├── {slug}-{branch}-problem-frame-{datetime}.md   # Problem Frame (/pm-problem-framing)
│   ├── {slug}-{branch}-assumption-map-{datetime}.md  # Assumption Map (/pm-assumption-audit)
│   ├── {slug}-{branch}-prototype-spec-{datetime}.md  # Prototype Spec (/pm-prototype)
│   ├── {slug}-{branch}-test-results-{datetime}.md    # Test Results (/pm-prototype)
│   ├── {slug}-{branch}-prioritisation-{datetime}.md  # Prioritisation (/pm-prioritisation)
│   └── {slug}-{branch}-trade-off-{datetime}.md       # Trade-off (/pm-trade-off-analysis)
├── reviews/
│   ├── {slug}-{branch}-cpo-review-{datetime}.md      # CPO Review (/pm-cpo-review)
│   ├── {slug}-{branch}-stakeholder-review-{datetime}.md  # Stakeholder Review
│   └── {slug}-{branch}-roadmap-review-{datetime}.md  # Roadmap Review
├── specs/
│   └── {slug}-{branch}-spec-{datetime}.md            # Polished Spec (/pm-spec-review)
├── research/                                          # Research artifacts (manual)
├── competitive/
│   └── {slug}-{branch}-competitive-intel-{datetime}.md  # Competitive Intel
├── retros/
│   └── {slug}-{branch}-post-launch-review-{datetime}.md  # Post-launch Review
├── qbrs/
│   ├── {slug}-{branch}-context-{datetime}.md             # QBR Context (/pm-qbr-context)
│   ├── {slug}-{branch}-narrative-{datetime}.md           # QBR Narrative (/pm-qbr-narrative)
│   ├── {slug}-{branch}-stress-test-{datetime}.md         # Stress Test (/pm-qbr-stress-test)
│   ├── {slug}-{branch}-red-team-{datetime}.md            # Red Team (/pm-qbr-red-team)
│   └── {slug}-{branch}-output-{datetime}.md              # Final Output (/pm-qbr-generate)
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
/pm-office-hours (new feature)
  → Produces: Brief, TE tree
  ↓
/pm-problem-framing
  → Reads: Brief
  → Produces: Problem Frame
  ↓
/pm-assumption-audit
  → Reads: Brief, Problem Frame
  → Produces: Assumption Map
  ↓
/pm-cpo-review
  → Reads: Brief, Problem Frame, Assumption Map, TE tree
  → Produces: CPO Review Report
  → Updates: Review Readiness Dashboard
  ↓
/pm-prototype
  → Reads: Brief, TE tree, Assumption Map, CPO Review
  → Produces: Prototype Spec, Test Results
  → Updates: Review Readiness Dashboard
  ↓
  [DECISION GATE — all required reviews complete]
  ↓
/pm-plan-stakeholder-review           /pm-spec-review
  → Reads: Brief, CPO Review,         → Reads: Brief, CPO Review,
    Prototype Spec, Test Results         Test Results, Stakeholder Review
  → Produces: Stakeholder Review      → Produces: Polished Spec
  → Updates: Dashboard                → Updates: Dashboard
  ↓
  Engineering Handoff
```

### Optimisation mode
```
/pm-office-hours (optimisation)
  → Produces: Brief with measurement scaffold
  ↓
/pm-metrics-review
  → Reads: Brief
  → Produces: Measurement Plan
  ↓
/pm-cpo-review → /pm-trade-off-analysis → /pm-prototype → /pm-post-launch-review
```

### Research mode
```
/pm-office-hours (research)
  → Produces: Brief with research plan and interview guide
  ↓
/pm-cpo-review (optional, for early challenge)
  ↓
[Run user interviews / usability test]
  ↓
/pm-competitive-intel (optional)
  ↓
Return to /pm-office-hours (New Feature or Optimisation mode) with findings
```

### Strategy mode
```
/pm-office-hours (strategy)
  → Produces: Brief with initiative inventory
  ↓
/pm-cpo-review (portfolio-level challenge)
  ↓
/pm-prioritisation → /pm-roadmap-review → /pm-comms-draft
  ↓
Break into individual initiatives → each runs New Feature mode
```

### QBR mode (full cycle)
```
/pm-qbr-context
  → Produces: QBR Context doc (audience profile, team work summary, decisions needed)
  ↓
/pm-qbr-narrative
  → Reads: QBR Context doc
  → Produces: QBR Narrative arc
  ↓
/pm-metrics-review (QBR pass)
  → Reads: QBR Narrative arc
  → Produces: Metrics Review (QBR)
  ↓
/pm-qbr-stress-test
  → Reads: QBR Narrative arc, Metrics Review
  → Produces: Stress Test report
  ↓
/pm-qbr-red-team
  → Reads: QBR Narrative arc, Stress Test report
  → Produces: Red Team report
  ↓
  [REVISION LOOP — address findings, update narrative, re-run stress test if needed]
  ↓
/pm-qbr-generate
  → Reads: All QBR artifacts
  → Produces: Slide outline, exec memo, and/or speaker script
  → Saves to: ~/.pmstack/qbrs/
```

### QBR mode (quick — existing draft)
```
Upload deck/doc
  ↓
/pm-qbr-stress-test → /pm-qbr-red-team
  ↓
  [REVISION LOOP]
  ↓
/pm-qbr-generate → Final Deliverable
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

## Multi-host support

PMStack generates skill files for multiple AI platforms from the same `.tmpl` source. Each platform is described by a `HostConfig` object in `hosts/`.

```
hosts/
├── claude.ts    # Primary host — no rewrites, all frontmatter kept
├── cursor.ts    # Cursor — strips to name+description, rewrites .claude/ → .cursor/
└── index.ts     # Registry: ALL_HOST_CONFIGS, getHostConfig(), getExternalHosts()
```

The `HostConfig` interface (`scripts/host-config.ts`) defines:

| Field | Purpose |
|-------|---------|
| `globalRoot` | Path relative to `~` where skills are installed (`'.cursor/skills/pmstack'`) |
| `usesEnvVars` | `true` → paths in content use `$PMSTACK_ROOT` etc. instead of literal `~/.claude/` |
| `frontmatter.mode` | `allowlist` (keep only listed fields) or `denylist` (strip listed fields) |
| `frontmatter.keepFields` | Fields to keep in allowlist mode |
| `pathRewrites` | Ordered list of `{ from, to }` string replacements applied to full content |
| `suppressedResolvers` | Resolver names that return `''` for this host |

**What non-Claude files look like:**
- Frontmatter stripped to `name` and `description` only (no `allowed-tools`, `preamble-tier`, etc.)
- Bash preamble blocks removed (the `{{PREAMBLE}}` resolver detects the host and skips them)
- All `.claude/skills/pmstack` path references rewritten to the host-equivalent
- Skill body content (phases, frameworks, output formats) unchanged

**Adding a new host:**

1. Create `hosts/myhost.ts` — copy `hosts/cursor.ts` as a starting point
2. Add to `hosts/index.ts`: import, add to `ALL_HOST_CONFIGS`, add to re-exports
3. Add `**/*.myhost.md` to `.gitignore`
4. Add `"gen:skill-docs:myhost": "bun run scripts/gen-skill-docs.ts --host myhost"` to `package.json`
5. Add detection to `setup` (follow the `register_for_cursor` pattern)
6. Verify: `bun run gen:skill-docs:myhost` then `grep -r ".claude/skills" **/*.myhost.md` (should be 0)

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
   bun run gen:skill-docs                    # generate Claude SKILL.md
   bun run gen:skill-docs --dry-run          # confirm it's FRESH
   grep -c '{{' my-skill/SKILL.md            # should be 0
   bun run gen:skill-docs:cursor             # generate Cursor variant
   grep -r ".claude/skills" my-skill/SKILL.cursor.md  # should be empty
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
