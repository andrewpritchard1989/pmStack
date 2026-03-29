import type { TemplateContext } from './types';

/**
 * PM framework resolvers — Thoughtful Execution tree, CPO challenge framework,
 * assumption map template.
 */

export function generateTeTreeTemplate(_ctx: TemplateContext): string {
  return `## Thoughtful Execution Tree

The TE tree prevents jumping from goal directly to solution. Always build it top-down.

**Structure:**
\`\`\`
Goal (measurable metric — what moves if this initiative succeeds?)
├── Data & Insights (what we know — evidence, not assumptions)
├── Opportunity Mountain A (a distinct problem/opportunity space)
│   ├── Hypothesis A1 (testable belief about user behavior or motivation)
│   │   ├── Solution Design A1a (specific intervention to test hypothesis)
│   │   └── Solution Design A1b (alternative design for same hypothesis)
│   ├── Hypothesis A2
│   └── Hypothesis A3
├── Opportunity Mountain B
│   ├── Hypothesis B1
│   └── Hypothesis B2
└── Opportunity Mountain C
\`\`\`

**Rules to enforce:**
1. Never jump from goal to solution. Always: Goal → Data → Opportunities → Hypotheses → Solutions.
2. Multiple hypotheses per opportunity. One hypothesis can't be validated by one design.
3. Multiple solution designs per hypothesis. One bad design can't invalidate a hypothesis.
4. MVP = basecamp. If results are positive, iterate before moving to the next opportunity.
5. When a hypothesis fails, move to the next branch. Don't redesign the same failed approach.
6. The TE tree is a living artifact. Update it after every prototype test and launch review.

**What a good opportunity mountain looks like:**
- Grounded in specific user behavior or evidence, not assumptions
- Distinct from other opportunity mountains (different problem, different user segment, different moment)
- Falsifiable — you can design tests that would tell you if you're wrong

**What a good hypothesis looks like:**
- "We believe [user type] struggle with [specific problem] because [specific reason]"
- Has a clear signal — you can define what evidence would validate or invalidate it
- Not a solution dressed as a hypothesis ("We believe adding a button will help users" is not a hypothesis)`;
}

export function generateCpoChallengeFramework(_ctx: TemplateContext): string {
  return `## CPO Challenge Framework

When reviewing an initiative as CPO, apply these 6 tests in sequence:

**1. Value test**
"Will users actually want this? Are you solving a real problem or building a feature because a competitor has it? What's the evidence of demand?"
- Look for: user research, behavioral data, direct quotes, problem frequency
- Red flag: initiative justified by "users have asked for this" without specifics, or "competitor X has it"

**2. Discovery test**
"Is this genuine product discovery or a stakeholder order dressed up as user research? Have you talked to users, or are you guessing?"
- Look for: actual user conversations, behavioral evidence, problem validation separate from solution validation
- Red flag: discovery conducted after the solution was already decided, or solutions validated in isolation

**3. Scope test**
"Is this the narrowest wedge that validates the hypothesis, or have you already gold-plated the solution before testing it?"
- Look for: clear line between what's needed to test the hypothesis and what would be nice to have
- Red flag: first version includes features that don't test the core hypothesis

**4. Strategic fit test**
"How does this connect to what actually matters for the business right now? What are you saying no to by saying yes?"
- Look for: explicit connection to current strategic priorities, opportunity cost acknowledged
- Red flag: initiative framed in isolation without reference to what it displaces

**5. Assumption test**
"What's the riskiest assumption here, and what happens to the entire initiative if it's wrong?"
- Look for: explicit identification of the load-bearing assumption, plan for what to do if it fails
- Red flag: no acknowledgment of what would kill the initiative, or riskiest assumption is untested

**6. TE tree challenge**
"Have you genuinely explored multiple opportunity mountains, or did you start with a solution and work backwards to justify it?"
- Look for: evidence that alternatives were considered and deliberately set aside, not just the chosen path
- Red flag: the TE tree has one opportunity mountain and one hypothesis that perfectly matches the proposed solution`;
}

export function generateAssumptionMapTemplate(_ctx: TemplateContext): string {
  return `## Assumption Map Template

For each assumption identified, rate it on two dimensions:
- **Risk:** How wrong could we be? (high / medium / low)
- **Knowability:** How hard is it to find out? (easy / medium / hard)

Priority for testing = high risk + easy to test first, then high risk + hard to test.

**Four assumption categories:**

**Value assumptions** — does this problem exist, and do users want it solved?
- "Users find [X] frustrating enough to change behavior"
- "Users will pay [price] for [benefit]"
- "Users prefer [our approach] over [status quo]"

**Usability assumptions** — can users actually use the solution?
- "Users will understand [interaction] without instruction"
- "Users will complete [flow] without dropping off at [step]"
- "Users will find [feature] in [location]"

**Feasibility assumptions** — can we build it reliably?
- "We can [capability] at [scale]"
- "[Integration/dependency] will work as expected"
- "Performance will be acceptable at [load]"

**Viability assumptions** — does it make business sense?
- "Enough users will [action] to justify the investment"
- "[Channel/partner/mechanism] will work to reach users"
- "We can sustain [operational requirement] at scale"

**Test design for high-risk assumptions:**
For each high-risk assumption, define:
- **What we'd measure:** specific signal that would tell us if the assumption holds
- **Test type:** fake door / prototype / concierge / survey / analytics / A/B
- **Success threshold:** what result would validate the assumption
- **Failure signal:** what result would invalidate it and redirect the initiative`;
}
