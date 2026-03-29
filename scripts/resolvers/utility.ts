import type { TemplateContext } from './types';

export function generateSlugEval(ctx: TemplateContext): string {
  return `eval "$(${ctx.paths.binDir}/pmstack-slug 2>/dev/null)"`;
}

export function generateSlugSetup(ctx: TemplateContext): string {
  return `eval "$(${ctx.paths.binDir}/pmstack-slug 2>/dev/null)" && mkdir -p ~/.pmstack/initiatives`;
}

export function generateBaseBranchDetect(_ctx: TemplateContext): string {
  return `## Step 0: Detect platform and base branch

First, detect the git hosting platform from the remote URL:

\`\`\`bash
git remote get-url origin 2>/dev/null
\`\`\`

- If the URL contains "github.com" → platform is **GitHub**
- If the URL contains "gitlab" → platform is **GitLab**
- Otherwise, check CLI availability:
  - \`gh auth status 2>/dev/null\` succeeds → platform is **GitHub**
  - \`glab auth status 2>/dev/null\` succeeds → platform is **GitLab**
  - Neither → **unknown** (use git-native commands only)

Determine which branch this PR/MR targets, or the repo's default branch if no PR/MR exists.

**If GitHub:**
1. \`gh pr view --json baseRefName -q .baseRefName\` — if succeeds, use it
2. \`gh repo view --json defaultBranchRef -q .defaultBranchRef.name\` — if succeeds, use it

**If GitLab:**
1. \`glab mr view -F json 2>/dev/null\` and extract the \`target_branch\` field
2. \`glab repo view -F json 2>/dev/null\` and extract the \`default_branch\` field

**Git-native fallback:**
1. \`git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||'\`
2. If that fails: \`git rev-parse --verify origin/main 2>/dev/null\` → use \`main\`
3. If that fails: \`git rev-parse --verify origin/master 2>/dev/null\` → use \`master\`

If all fail, fall back to \`main\`.

---`;
}

export function generateCoAuthorTrailer(_ctx: TemplateContext): string {
  return 'Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>';
}
