#!/usr/bin/env bun
/**
 * Generate SKILL.md files from .tmpl templates.
 *
 * Pipeline:
 *   read .tmpl → find {{PLACEHOLDERS}} → resolve from source → transform → write
 *
 * Flags:
 *   --host <name|all>  Target host (default: claude). 'all' generates every external host.
 *   --dry-run          Exit 1 if any generated file differs from committed version.
 *
 * Output paths:
 *   Claude:   skill/SKILL.md          (committed to repo)
 *   Cursor:   skill/SKILL.cursor.md   (gitignored, generated on user's machine)
 */

import { discoverTemplates } from './discover-skills';
import * as fs from 'fs';
import * as path from 'path';
import type { TemplateContext } from './resolvers/types';
import { HOST_PATHS } from './resolvers/types';
import { RESOLVERS } from './resolvers/index';
import { ALL_HOST_NAMES, getHostConfig, getExternalHosts, resolveHostArg } from '../hosts/index';
import type { HostConfig } from './host-config';

const ROOT = path.resolve(import.meta.dir, '..');
const DRY_RUN = process.argv.includes('--dry-run');

// ─── Host resolution ────────────────────────────────────────

function parseHostArg(): string {
  const idx = process.argv.indexOf('--host');
  if (idx === -1 || !process.argv[idx + 1]) return 'claude';
  const arg = process.argv[idx + 1];
  if (arg === 'all') return 'all';
  try {
    return resolveHostArg(arg);
  } catch {
    console.error(`Unknown host: ${arg}. Valid hosts: ${ALL_HOST_NAMES.join(', ')}, all`);
    process.exit(1);
  }
}

function getTargetHosts(): HostConfig[] {
  const arg = parseHostArg();
  if (arg === 'all') return getExternalHosts();
  return [getHostConfig(arg)];
}

// ─── Frontmatter transformation ─────────────────────────────

/**
 * Filter frontmatter fields according to the host's allowlist/denylist config.
 * Returns content unchanged for Claude (no transformation needed).
 */
function transformFrontmatter(content: string, hostConfig: HostConfig): string {
  if (hostConfig.name === 'claude') return content;

  const fmStart = content.indexOf('---\n');
  if (fmStart !== 0) return content;
  const fmEnd = content.indexOf('\n---', fmStart + 4);
  if (fmEnd === -1) return content;

  const fmBody = content.slice(fmStart + 4, fmEnd);
  const afterFm = content.slice(fmEnd); // includes '\n---'

  const { mode, keepFields = [], stripFields = [], descriptionLimit } = hostConfig.frontmatter;

  // Parse frontmatter into field blocks.
  // A block = the key: value line + any following indented continuation lines.
  const lines = fmBody.split('\n');
  const blocks: Array<{ key: string; lines: string[] }> = [];
  let current: { key: string; lines: string[] } | null = null;

  for (const line of lines) {
    const isTopLevel = line.length > 0 && !line.startsWith(' ') && !line.startsWith('\t');
    const keyMatch = isTopLevel ? line.match(/^([\w-]+):/) : null;
    if (keyMatch) {
      if (current) blocks.push(current);
      current = { key: keyMatch[1], lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) blocks.push(current);

  // Filter blocks
  const filtered = blocks.filter(b => {
    if (mode === 'allowlist') return keepFields.includes(b.key);
    if (mode === 'denylist') return !stripFields.includes(b.key);
    return true;
  });

  // Enforce description length limit
  if (descriptionLimit != null) {
    const descBlock = filtered.find(b => b.key === 'description');
    if (descBlock) {
      const full = descBlock.lines.join('\n');
      if (full.length > descriptionLimit) {
        throw new Error(
          `[${hostConfig.name}] description exceeds ${descriptionLimit} chars (${full.length}). ` +
          `Set descriptionLimit: null or shorten the description.`
        );
      }
    }
  }

  const newFm = filtered.map(b => b.lines.join('\n')).join('\n');
  return `---\n${newFm}${afterFm}`;
}

// ─── Path rewrites ──────────────────────────────────────────

function applyPathRewrites(content: string, hostConfig: HostConfig): string {
  let result = content;
  for (const { from, to } of hostConfig.pathRewrites) {
    result = result.replaceAll(from, to);
  }
  return result;
}

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

function processTemplate(tmplPath: string, hostConfig: HostConfig): { outputPath: string; content: string } {
  const tmplContent = fs.readFileSync(tmplPath, 'utf-8');
  const relTmplPath = path.relative(ROOT, tmplPath);

  // Output path: Claude → SKILL.md, others → SKILL.{host}.md
  const baseOutputPath = tmplPath.replace(/\.tmpl$/, '');
  const outputPath = hostConfig.name === 'claude'
    ? baseOutputPath
    : baseOutputPath.replace(/\.md$/, `.${hostConfig.name}.md`);

  // Extract skill name from frontmatter
  const { name: extractedName } = extractNameAndDescription(tmplContent);
  const skillName = extractedName || path.basename(path.dirname(tmplPath));

  // Extract benefits-from list from frontmatter (inline YAML: benefits-from: [a, b])
  const benefitsMatch = tmplContent.match(/^benefits-from:\s*\[([^\]]*)\]/m);
  const benefitsFrom = benefitsMatch
    ? benefitsMatch[1].split(',').map(s => s.trim()).filter(Boolean)
    : undefined;

  // Extract preamble-tier from frontmatter
  const tierMatch = tmplContent.match(/^preamble-tier:\s*(\d+)$/m);
  const preambleTier = tierMatch ? parseInt(tierMatch[1], 10) : undefined;

  const ctx: TemplateContext = {
    skillName,
    tmplPath,
    benefitsFrom,
    host: hostConfig.name,
    paths: HOST_PATHS[hostConfig.name],
    preambleTier,
    hostConfig,
  };

  // Resolve placeholders, skipping suppressed ones for this host
  const suppressedResolvers = new Set(hostConfig.suppressedResolvers ?? []);
  let content = tmplContent.replace(/\{\{(\w+)\}\}/g, (_match, name) => {
    if (suppressedResolvers.has(name)) return '';
    const resolver = RESOLVERS[name];
    if (!resolver) throw new Error(`Unknown placeholder {{${name}}} in ${relTmplPath}`);
    return resolver(ctx);
  });

  // Check for any remaining unresolved placeholders
  const remaining = content.match(/\{\{(\w+)\}\}/g);
  if (remaining) {
    throw new Error(`Unresolved placeholders in ${relTmplPath}: ${remaining.join(', ')}`);
  }

  // Apply host-specific transforms (frontmatter filtering, path rewrites)
  content = transformFrontmatter(content, hostConfig);
  content = applyPathRewrites(content, hostConfig);

  // Prepend generated header after frontmatter
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

const targetHosts = getTargetHosts();
let hasChanges = false;
const tokenBudget: Array<{ skill: string; lines: number; tokens: number }> = [];

for (const hostConfig of targetHosts) {
  if (targetHosts.length > 1) {
    console.log(`\n── ${hostConfig.displayName} ──────────────────────────────────────`);
  }

  for (const tmplPath of findTemplates()) {
    const { outputPath, content } = processTemplate(tmplPath, hostConfig);
    const relOutput = path.relative(ROOT, outputPath);

    if (DRY_RUN) {
      // For non-Claude hosts in dry-run, only flag if the file exists and is stale
      if (hostConfig.name !== 'claude' && !fs.existsSync(outputPath)) {
        console.log(`MISSING (run gen:skill-docs:${hostConfig.name}): ${relOutput}`);
        continue;
      }
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

    // Token budget tracking (Claude only to avoid double-counting)
    if (hostConfig.name === 'claude') {
      const lines = content.split('\n').length;
      const tokens = Math.round(content.length / 4); // ~4 chars per token
      tokenBudget.push({ skill: relOutput, lines, tokens });
    }
  }
}

if (DRY_RUN && hasChanges) {
  console.error('\nGenerated SKILL.md files are stale. Run: bun run gen:skill-docs');
  process.exit(1);
}

// Print token budget summary (Claude only)
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
