import type { TemplateContext } from './types';

/**
 * PM-specific utility resolvers for PMStack.
 * Handles artifact saving, discovery, and the Review Readiness Dashboard.
 */

export function generateInitiativeSave(ctx: TemplateContext): string {
  return `\`\`\`bash
eval "$(${ctx.paths.binDir}/pmstack-slug 2>/dev/null)"
mkdir -p ~/.pmstack/initiatives
DATETIME=$(date +%Y%m%d-%H%M%S)
\`\`\``;
}

export function generateInitiativeDiscover(ctx: TemplateContext): string {
  return `Run this to find and read the Product Brief for the current initiative:

\`\`\`bash
eval "$(${ctx.paths.binDir}/pmstack-slug 2>/dev/null)"
echo "SLUG: $SLUG | BRANCH: $BRANCH"
BRIEF_FILE=$(ls -t ~/.pmstack/initiatives/$SLUG-$BRANCH-brief-*.md 2>/dev/null | head -1)
if [ -z "$BRIEF_FILE" ]; then
  echo "NO_BRIEF_FOUND"
else
  echo "BRIEF_FOUND: $BRIEF_FILE"
  cat "$BRIEF_FILE"
fi
\`\`\`

If \`NO_BRIEF_FOUND\`: stop and ask the PM to run \`/office-hours\` first. This skill requires a Product Brief to anchor the analysis. Do not proceed without one.

If \`BRIEF_FOUND\`: read the full brief. Reference specific sections throughout the phases — the goal, opportunity mountains, hypotheses, and open questions are the primary anchors.`;
}

export function generateQbrSave(ctx: TemplateContext): string {
  return `\`\`\`bash
eval "$(${ctx.paths.binDir}/pmstack-slug 2>/dev/null)"
mkdir -p ~/.pmstack/qbrs
DATETIME=$(date +%Y%m%d-%H%M%S)
\`\`\``;
}

export function generateQbrDiscover(ctx: TemplateContext): string {
  return `Run this to find all QBR artifacts for the current initiative:

\`\`\`bash
eval "$(${ctx.paths.binDir}/pmstack-slug 2>/dev/null)"
echo "SLUG: $SLUG | BRANCH: $BRANCH"
QBR_CONTEXT=$(ls -t ~/.pmstack/qbrs/$SLUG-$BRANCH-context-*.md 2>/dev/null | head -1)
QBR_NARRATIVE=$(ls -t ~/.pmstack/qbrs/$SLUG-$BRANCH-narrative-*.md 2>/dev/null | head -1)
QBR_STRESS=$(ls -t ~/.pmstack/qbrs/$SLUG-$BRANCH-stress-test-*.md 2>/dev/null | head -1)
QBR_REDTEAM=$(ls -t ~/.pmstack/qbrs/$SLUG-$BRANCH-red-team-*.md 2>/dev/null | head -1)
echo "QBR Context: \${QBR_CONTEXT:-NOT_FOUND}"
echo "QBR Narrative: \${QBR_NARRATIVE:-NOT_FOUND}"
echo "QBR Stress Test: \${QBR_STRESS:-NOT_FOUND}"
echo "QBR Red Team: \${QBR_REDTEAM:-NOT_FOUND}"
[ -n "$QBR_CONTEXT" ] && cat "$QBR_CONTEXT"
[ -n "$QBR_NARRATIVE" ] && cat "$QBR_NARRATIVE"
[ -n "$QBR_STRESS" ] && cat "$QBR_STRESS"
[ -n "$QBR_REDTEAM" ] && cat "$QBR_REDTEAM"
\`\`\`

If \`QBR_CONTEXT\` is \`NOT_FOUND\`: stop and ask the PM to run \`/qbr-context\` first. This skill requires a QBR Context Brief to anchor the analysis.

If artifacts are found: read them all. The Context Brief anchors the exec persona. The Narrative is what's being tested or generated from. The Stress Test and Red Team findings drive revision.`;
}

export function generateReviewReadinessDashboard(ctx: TemplateContext): string {
  return `## Review Readiness Dashboard

After completing this review, read the review log and render the dashboard:

\`\`\`bash
eval "$(${ctx.paths.binDir}/pmstack-slug 2>/dev/null)"
${ctx.paths.binDir}/pmstack-review-read 2>/dev/null || echo "NO_REVIEWS"
\`\`\`

Parse the JSONL output (lines before \`---CONFIG---\`) and render this table:

\`\`\`
+====================================================================+
|                    REVIEW READINESS DASHBOARD                       |
+====================================================================+
| Review              | Runs | Last Run            | Status    | Req  |
|---------------------|------|---------------------|-----------|------|
| Problem Framing     |  ?   | ?                   | ?         | YES  |
| Assumption Audit    |  ?   | ?                   | ?         | YES  |
| CPO Review          |  ?   | ?                   | ?         | YES  |
| Prototype Test      |  ?   | ?                   | ?         | YES  |
| Stakeholder Review  |  ?   | ?                   | ?         | no   |
| Spec Review         |  ?   | ?                   | ?         | no   |
+--------------------------------------------------------------------+
| VERDICT: [READY / BLOCKED — <reason>]                               |
+====================================================================+
\`\`\`

Fill in each row from the JSONL. If no reviews have run, all rows show 0 / — / — .

**VERDICT logic:**
- READY: all 4 required gates (Problem Framing, Assumption Audit, CPO Review, Prototype Test) show DONE
- BLOCKED: state which required gate(s) have not yet run

Log this review run:

\`\`\`bash
${ctx.paths.binDir}/pmstack-review-log '{"skill":"SKILL_NAME","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","status":"DONE"}' 2>/dev/null || true
\`\`\`

Replace \`SKILL_NAME\` with this skill's name.`;
}
