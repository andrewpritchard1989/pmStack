```yaml
title: Planning Research Guide
version: "1.0"
owner: UX Research Team
last_updated: 2025-07-23
tags: [research, questions, hypotheses, discovery, participant recruitment, screener, sample size, selection bias, qualitative research, double diamond, usability testing, concept testing, method selection, unmoderated study]
routing_keywords: [research plan, planning research, method selection, sample size, recruitment, screener, bias]
```
### Purpose
Learn **when** to run user tests, **why** to plan, **what** to include, and **how** to create an effective research/test plan.

---

## 1. When should I invest in user testing?
- **High assumptions or unknowns** – significant knowledge gaps in how users will behave
- **Conflicting opinions** – need evidence to make decisions
- **Major redesigns** – especially after big UI/UX shifts
- **New features/functionality** – impact on core experience unclear
- **General rule:** *Test early. Test often.* Several quick cycles > one pixel-perfect test

---

## 2. When should I skip (or defer) user testing?
- **Low risk change** – small changess, low impact on users and/or business
- **No impact on decisions** – results won’t be used or there’s no time to act
- **Better alternatives** – e.g., quick A/B test answers the question
- **Sufficient existing data** – you already know enough from existing data or insights
- **Unclear goals** – can’t define what you’re trying to learn yet

---

## 3. Why bother planning a research study?
- Saves time & resources
- Provides clarity & focus
- Enables communication & collaboration across stakeholders
- Improves data quality & validity

---

## 4. What is a research plan?
A **living, collaborative document** that:
- Overviews the study (single reference point)
- Unlocks valid, meaningful research by aligning scope, method, and stakeholders

**Level of detail:**
- *Lightweight* for low-risk/low-profile work
- *In-depth* for high-risk/high-profile work (include scope, constraints, timeline, deliverables)


---

## 5. How to create a research plan
Include these sections:
1. **Context**
2. **Research Goal(s)**
3. **Research Questions**
4. **Participants & Recruitment**
5. **Method** (selection & rationale)

### 5.1 Context
Sets the stage, helps stakeholders get up to speed, and lets researchers context-switch.

**Include:**
- **Product/project background** – Why this research now?
- **Product development phase** – Problem vs. solution space (Double Diamond)
- **Business need/objectives** – Decisions/impact this study informs
- **Existing data** – Prior research, analytics, CS insights
- **Stakeholders** – Who cares / is impacted

**Example (good context):**
- The *First Impressions* research (May 2024) showed onboarding doesn’t introduce key features or drive key actions—hurting trial and retention.
- Analytics: 45% don’t complete onboarding; +30% don’t purchase in first 3 months.
- With a focus on retention, R&E teams are redesigning onboarding to help new users see value and take retention-driving actions (e.g., notifications).
- This study evaluates how well the new design achieves that, aiming to increase completion and 30-day retention.
- Stakeholders: Retention & Engagement teams, LTV Brand team.

### 5.2 Research Goal vs. Research Question
- **Research goals** = Broad, high-level aims (what you hope to achieve)
- **Research questions** = Focused inquiries that inform the goal

#### 5.2.1 Why goals matter
They shape:
- Method choice
- Who you recruit
- Tasks & interview questions
- Note-taking, analysis, reporting
They align the team, save time, and prevent misdirection.

**Goal template:**
> We want to [understand/discover/evaluate/observe] **[subject]** in order to **[desired outcome]**.

**Example goal:**
> We want to evaluate the effectiveness of the new onboarding experience in order to improve first-time user engagement & retention.

**AI guidance when writing research goals**
- Begin by writing the Context, Research Goals, and Research Questions in your own words 
- These shape the entire direction of the study, so getting them clear and grounded in real team needs is essential 
- If you can't confidently explain what you're hoping to learn or what decision the research is supporting, it may be worth revisiting whether research is needed 
- Make your ‘Context’ section rich with detail. AI can perform best when it understands the bigger picture 
- Use AI to help you refine and stress-test what you’ve written 

**AI prompt tips + examples**
1. Be clear about the scope, and ask for critique 
'''Here’s the context for our project and my first draft of the research goal and questions. Suggest improvements or gaps, based only on the context I’ve provided.''' 
2. Ask your AI tool to follow established best practices - you may need to explicitly list the characteristics you want the output to have 
'''When reviewing the Research Goal and Research Questions, keep in mind best practices for how these should be written and framed.'''
3. Ask it to help surface and avoid bias 
'''Here’s our draft research goal and questions. Can you highlight any assumptions or leading language that might bias the research? Please suggest more neutral or open alternatives.'''

#### 5.2.2 From goal → questions
Ask yourself:
- What are the unknowns?
- What assumptions do we hold?
- Which aspects need exploration?

**Good research question traits:**
- **Specific** – targets a particular behaviour/aspect
  - Bad: “What do users think about onboarding?”
  - Good: “To what extent does the new onboarding experience instil trust in Trainline for new users?”
- **Actionable** – leads to decisions
  - Bad: “What should we call the AI Assistant?”
  - Good: “What language do users use to describe the AI Assistant?”
- **Achievable** – answerable with available time/resources
  - Bad: “How well does onboarding work across all markets?”
  - Good: “How well does onboarding work for travellers in Japan?”
- **User-centred** – needs, behaviours, pain points, motivations
  - Bad: How can we make onboarding faster to increase user registration and reduce drop-offs? 
  - Good: What challenges do users face when signing up?


**Example goal & questions**
- **Goal:** Evaluate effectiveness of new onboarding to improve first-time engagement & retention
- **Questions:**
  - How easy is the onboarding to understand?
  - Does it encourage exploration of key features?
  - How does it influence likelihood of returning after first session?
  - How clear is privacy/tracking information?
  - Do users understand core product features?

#### 5.2.3 Be aware of bias
**Confirmation bias**
- **Definition:** occurs when researchers unintentionally design research to confirm existing assumptions or beliefs, rather than exploring all possibilities.
- **Impact:** Framing Research Goals/Questions too narrowly or in a leading way can bias your investigation, focusing on confirming assumptions and limiting analysis.
- **Recommendation:** Frame Research Goals/Questions in an open-ended way and test multiple hypotheses rather than focusing on one.

---

### 5.4 Participants & Recruitment

#### 5.4.1 Key questions
- Who can best answer our goals/questions?
- Current vs. prospective users?
- Which segments (demographic, behavioural, attitudinal) matter?

#### 5.4.2 Selection criteria (dimensions & examples)
- **Demographics:** age, gender, education, income
- **Location:** primary markets, urban vs rural
- **Behaviours:** travel frequency, booking method, trip types
- **Psychographics:** tech adoption, price sensitivity, sustainability attitude
> *Tip:* More criteria ⇒ harder/costlier recruitment. Use only what matters.

#### 5.4.3 Recruitment criteria vs. screener
- **Recruitment criteria** = bullet-point description (e.g., “Frequent train travellers”)
- **Screener** = questions that operationalise each criterion (e.g., “How often do you travel by train?”)

#### 5.4.4 Standard criteria (Unmoderated tests – Trainline example)
- Ages 18–45; mix of genders; ≥1 participant with accessibility need
- Markets: UK & EU (panel coverage outside UK/US may be thin)
- Behavioural mix: high value, high frequency, ticket spend > £/€30
- Mix of new vs. existing Trainline users

#### 5.4.5 Sample size guidelines (qualitative)
- Diary study: **≥10**
- Concept test: **≥7**
- Usability test: **≥5**
- Interview study: **≥8**
> Nielsen: 5 users often uncover ~80% of usability issues. Increase N if: multiple segments, unmoderated study, or researcher inexperience.

#### 5.4.6 Saturation vs. generalisation
- **Saturation** = no new themes emerging (qual aim)
- **Generalisation** = apply findings to population (quant aim)
Small samples are useful—just state limitations clearly.

#### 5.4.7 Selection bias & mitigation
- Bias arises when sample ≠ target population
- Mitigate via diversified channels and ensuring key segments are represented

---

## 6. Method selection

### 6.1 Decision drivers (no one-size-fits-all)
1. Product phase (Discover ↔ Deliver in Double Diamond)
2. Data needed: exploratory (why/what) vs evaluative (how well)
3. Constraints: time, budget, researcher availability, geography

### 6.2 Double Diamond mapping
**Discover (Problem)** – Interviews, Diary Study, Contextual Inquiry, Card Sort, Survey

**Deliver (Solution)** – Concept Test, Usability Test, Content/Copy Test, Tree Test, Survey

> **Usability Test:** Can users accomplish key tasks?
> **Concept Test:** Does the concept effectively solve the problem?

---
