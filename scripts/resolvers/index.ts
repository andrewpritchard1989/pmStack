/**
 * RESOLVERS record — maps {{PLACEHOLDER}} names to generator functions.
 * Each resolver takes a TemplateContext and returns the replacement string.
 */

import type { TemplateContext } from './types';

// Core modules
import { generatePreamble } from './preamble';
import { generateCommandReference, generateSnapshotFlags, generateBrowseSetup } from './browse';
import { generateSlugEval, generateSlugSetup, generateBaseBranchDetect, generateCoAuthorTrailer } from './utility';

// PM-specific modules
import { generateInitiativeSave, generateInitiativeDiscover, generateReviewReadinessDashboard } from './pm-utility';
import { generateTeTreeTemplate, generateCpoChallengeFramework, generateAssumptionMapTemplate } from './pm-frameworks';

export const RESOLVERS: Record<string, (ctx: TemplateContext) => string> = {
  // Core
  PREAMBLE: generatePreamble,
  SLUG_EVAL: generateSlugEval,
  SLUG_SETUP: generateSlugSetup,
  BASE_BRANCH_DETECT: generateBaseBranchDetect,
  CO_AUTHOR_TRAILER: generateCoAuthorTrailer,

  // Browse
  COMMAND_REFERENCE: generateCommandReference,
  SNAPSHOT_FLAGS: generateSnapshotFlags,
  BROWSE_SETUP: generateBrowseSetup,

  // PM utility
  INITIATIVE_SAVE: generateInitiativeSave,
  INITIATIVE_DISCOVER: generateInitiativeDiscover,
  REVIEW_READINESS_DASHBOARD: generateReviewReadinessDashboard,

  // PM frameworks
  TE_TREE_TEMPLATE: generateTeTreeTemplate,
  CPO_CHALLENGE_FRAMEWORK: generateCpoChallengeFramework,
  ASSUMPTION_MAP_TEMPLATE: generateAssumptionMapTemplate,
};
