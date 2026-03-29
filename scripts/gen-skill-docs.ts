#!/usr/bin/env bun
/**
 * Generate SKILL.md files from .tmpl templates.
 *
 * Pipeline:
 *   read .tmpl → find {{PLACEHOLDERS}} → resolve from source → format → write .md
 *
 * Supports --dry-run: generate to memory, exit 1 if different from committed file.
 * Used by skill:check and CI freshness checks.
 */

import { discoverTemplates } from './discover-skills';
import * as fs from 'fs';
import * as path from 'path';
import type { TemplateContext } from './resolvers/types';
import { HOST_PATHS } from './resolvers/types';
import { RESOLVERS } from './resolvers/index';

const ROOT = path.resolve(import.meta.dir, '..');
const DRY_RUN = process.argv.includes('--dry-run');
const HOST = 'claude' as const;

// ─── Template Processing ────────────────────────────────────

const GENERATED_HEADER = `<!-- AUTO-GENERATED from {{SOURCE}} — do not edit directly -->\n<!-- Regenerate: bun run gen:skill-docs -->\n`;

function extractNameAndDescription(content: string): { name: string; description: string } {
  const fmStart = content.indexOf('---\n');
  if (fmStart !== 0) return { name: '', description: '' };
  const fmEnd = content.indexOf('\n---', fmStart + 4);
  if (fmEnd === -1) return { name: '', description: '' };

  const frontmatter = content.slice(fmStart + 4, fmEnd);
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const name = nameMatch ? nameMatch[1].trim() : '';

  let description = '';
  const lines = frontmatter.split('\n');
  let inDescription = false;
  const descLines: string[] = [];
  for (const line of lines) {
    if (line.match(/^description:\s*\|?\s*$/)) {
      inDescription = true;
      continue;
    }
    if (line.match(/^description:\s*\S/)) {
      description = line.replace(/^description:\s*/, '').trim();
      break;
    }
    if (inDescription) {
      if (line === '' || line.match(/^\s/)) {
        descLines.push(line.replace(/^  /, ''));
      } else {
        break;
      }
    }
  }
  if (descLines.length > 0) {
    description = descLines.join('\n').trim();
  }

  return { name, description };
}

function processTemplate(tmplPath: string): { outputPath: string; content: string } {
  const tmplContent = fs.readFileSync(tmplPath, 'utf-8');
  const relTmplPath = path.relative(ROOT, tmplPath);
  const outputPath = tmplPath.replace(/\.tmpl$/, '');

  // Determine skill directory relative to ROOT
  const skillDir = path.relative(ROOT, path.dirname(tmplPath));

  // Extract skill name from frontmatter for TemplateContext
  const { name: extractedName } = extractNameAndDescription(tmplContent);
  const skillName = extractedName || path.basename(path.dirname(tmplPath));

  // Extract benefits-from list from frontmatter (inline YAML: benefits-from: [a, b])
  const benefitsMatch = tmplContent.match(/^benefits-from:\s*\[([^\]]*)\]/m);
  const benefitsFrom = benefitsMatch
    ? benefitsMatch[1].split(',').map(s => s.trim()).filter(Boolean)
    : undefined;

  // Extract preamble-tier from frontmatter (1-4, controls which preamble sections are included)
  const tierMatch = tmplContent.match(/^preamble-tier:\s*(\d+)$/m);
  const preambleTier = tierMatch ? parseInt(tierMatch[1], 10) : undefined;

  const ctx: TemplateContext = { skillName, tmplPath, benefitsFrom, host: HOST, paths: HOST_PATHS[HOST], preambleTier };

  // Replace placeholders
  let content = tmplContent.replace(/\{\{(\w+)\}\}/g, (match, name) => {
    const resolver = RESOLVERS[name];
    if (!resolver) throw new Error(`Unknown placeholder {{${name}}} in ${relTmplPath}`);
    return resolver(ctx);
  });

  // Check for any remaining unresolved placeholders
  const remaining = content.match(/\{\{(\w+)\}\}/g);
  if (remaining) {
    throw new Error(`Unresolved placeholders in ${relTmplPath}: ${remaining.join(', ')}`);
  }

  // Prepend generated header (after frontmatter)
  const header = GENERATED_HEADER.replace('{{SOURCE}}', path.basename(tmplPath));
  const fmEnd = content.indexOf('---', content.indexOf('---') + 3);
  if (fmEnd !== -1) {
    const insertAt = content.indexOf('\n', fmEnd) + 1;
    content = content.slice(0, insertAt) + header + content.slice(insertAt);
  } else {
    content = header + content;
  }

  return { outputPath, content };
}

// ─── Main ───────────────────────────────────────────────────

function findTemplates(): string[] {
  return discoverTemplates(ROOT).map(t => path.join(ROOT, t.tmpl));
}

let hasChanges = false;
const tokenBudget: Array<{ skill: string; lines: number; tokens: number }> = [];

for (const tmplPath of findTemplates()) {
  const { outputPath, content } = processTemplate(tmplPath);
  const relOutput = path.relative(ROOT, outputPath);

  if (DRY_RUN) {
    const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf-8') : '';
    if (existing !== content) {
      console.log(`STALE: ${relOutput}`);
      hasChanges = true;
    } else {
      console.log(`FRESH: ${relOutput}`);
    }
  } else {
    fs.writeFileSync(outputPath, content);
    console.log(`GENERATED: ${relOutput}`);
  }

  // Track token budget
  const lines = content.split('\n').length;
  const tokens = Math.round(content.length / 4); // ~4 chars per token
  tokenBudget.push({ skill: relOutput, lines, tokens });
}

if (DRY_RUN && hasChanges) {
  console.error('\nGenerated SKILL.md files are stale. Run: bun run gen:skill-docs');
  process.exit(1);
}

// Print token budget summary
if (!DRY_RUN && tokenBudget.length > 0) {
  tokenBudget.sort((a, b) => b.lines - a.lines);
  const totalLines = tokenBudget.reduce((s, t) => s + t.lines, 0);
  const totalTokens = tokenBudget.reduce((s, t) => s + t.tokens, 0);

  console.log('');
  console.log('Token Budget');
  console.log('═'.repeat(60));
  for (const t of tokenBudget) {
    const name = t.skill.replace(/\/SKILL\.md$/, '');
    console.log(`  ${name.padEnd(30)} ${String(t.lines).padStart(5)} lines  ~${String(t.tokens).padStart(6)} tokens`);
  }
  console.log('─'.repeat(60));
  console.log(`  ${'TOTAL'.padEnd(30)} ${String(totalLines).padStart(5)} lines  ~${String(totalTokens).padStart(6)} tokens`);
  console.log('');
}
