#!/usr/bin/env bun
/**
 * Validate generated SKILL.md files.
 *
 * Checks each SKILL.md for:
 *   - Required frontmatter fields (name, preamble-tier, version, description, allowed-tools)
 *   - No unresolved {{PLACEHOLDER}} tokens
 *   - Required sections (Role, When to use, Output format, Downstream connections, Completion)
 *     — only enforced for preamble-tier >= 2 (not browse/setup-browser-cookies)
 *
 * Exits 0 if all pass, 1 if any fail.
 */

import { discoverSkillFiles } from './discover-skills';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(import.meta.dir, '..');

const REQUIRED_FRONTMATTER = ['name', 'preamble-tier', 'version', 'description', 'allowed-tools'];

// Sections required for PM skills (tier >= 2)
const REQUIRED_SECTIONS = [
  '## Role',
  '## When to use',
  '## Output format',
  '## Downstream connections',
  '## Completion',
];

interface CheckResult {
  skill: string;
  pass: boolean;
  errors: string[];
}

function parseFrontmatter(content: string): Record<string, string> | null {
  if (!content.startsWith('---\n')) return null;
  const end = content.indexOf('\n---', 4);
  if (end === -1) return null;
  const block = content.slice(4, end);
  const fields: Record<string, string> = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^([\w-]+):/);
    // Record key presence regardless of whether value is inline or a YAML list below
    if (m) fields[m[1]] = line.slice(m[0].length).trim();
  }
  return fields;
}

function checkSkill(skillPath: string): CheckResult {
  const rel = path.relative(ROOT, skillPath);
  const content = fs.readFileSync(skillPath, 'utf-8');
  const errors: string[] = [];

  // Frontmatter
  const fm = parseFrontmatter(content);
  if (!fm) {
    errors.push('missing or malformed frontmatter');
  } else {
    for (const field of REQUIRED_FRONTMATTER) {
      if (!(field in fm)) errors.push(`frontmatter missing: ${field}`);
    }
  }

  // No unresolved placeholders
  const unresolved = content.match(/\{\{[A-Z_]+\}\}/g);
  if (unresolved) {
    errors.push(`unresolved placeholders: ${[...new Set(unresolved)].join(', ')}`);
  }

  // Required sections — only for tier >= 2 PM skills
  const tier = fm ? parseInt(fm['preamble-tier'] ?? '0', 10) : 0;
  if (tier >= 2) {
    for (const section of REQUIRED_SECTIONS) {
      if (!content.includes(section)) {
        errors.push(`missing section: ${section}`);
      }
    }
  }

  return { skill: rel, pass: errors.length === 0, errors };
}

const skillFiles = discoverSkillFiles(ROOT).map(f => path.join(ROOT, f));
const results: CheckResult[] = skillFiles.map(checkSkill);

let anyFail = false;
for (const r of results) {
  if (r.pass) {
    console.log(`PASS  ${r.skill}`);
  } else {
    console.log(`FAIL  ${r.skill}`);
    for (const e of r.errors) console.log(`        ${e}`);
    anyFail = true;
  }
}

console.log('');
console.log(`${results.filter(r => r.pass).length}/${results.length} passed`);

if (anyFail) process.exit(1);
