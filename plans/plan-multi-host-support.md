# Implementation Plan: Multi-Host Platform Support

## What this does

Allows PMStack skills to be generated for AI platforms beyond Claude Code — specifically
Cursor and OpenAI Codex CLI (codex) as the first targets, with a clean abstraction that
makes adding further hosts a one-file change.

Currently `scripts/resolvers/types.ts` has `Host = 'claude'` hardcoded and
`gen-skill-docs.ts` bakes in `const HOST = 'claude' as const`. This plan introduces a
`hosts/` directory with per-host config files and updates the build pipeline to generate
platform-specific `SKILL.md` variants.

## Reference implementation

The upstream gstack repo (`https://github.com/garrytan/gstack`) ships a `hosts/`
directory with configs for 8 platforms. Before implementing, fetch and read these files
from gstack to use as a reference — particularly:
- `hosts/cursor.ts` — path conventions for Cursor
- `hosts/codex.ts` — path conventions for OpenAI Codex CLI
- `hosts/factory.ts` — the config interface and how path rewriting works
- `docs/ADDING_A_HOST.md` — the process gstack uses for onboarding new platforms

Do not blindly copy gstack's configs. Read them, understand the conventions, then
implement equivalents for PMStack's paths (`pmstack` replaces `gstack` everywhere).

## Files to change

### 1. `scripts/resolvers/types.ts` — extend the Host type

**Current:**
```typescript
export type Host = 'claude';

export interface HostPaths {
  skillRoot: string;
  localSkillRoot: string;
  binDir: string;
  browseDir: string;
}

export const HOST_PATHS: Record<Host, HostPaths> = {
  claude: {
    skillRoot: '~/.claude/skills/pmstack',
    localSkillRoot: '.claude/skills/pmstack',
    binDir: '~/.claude/skills/pmstack/bin',
    browseDir: '~/.claude/skills/pmstack/browse/dist',
  },
};
```

**Replace with:**
```typescript
export type Host = 'claude' | 'cursor' | 'codex';

export interface HostPaths {
  skillRoot: string;        // absolute path where skills live on the user's machine
  localSkillRoot: string;   // project-relative path (for --local installs)
  binDir: string;           // where pmstack bin/ utilities are
  browseDir: string;        // where the browse binary lives
}

export interface HostConfig {
  paths: HostPaths;
  /** Human-readable name shown in setup output */
  displayName: string;
  /** File extension for generated skill files (default: 'md') */
  skillFileExt?: string;
  /** Whether this host supports the allowed-tools frontmatter field */
  supportsAllowedTools?: boolean;
  /** Whether this host supports multi-line description in frontmatter */
  supportsMultilineDescription?: boolean;
  /** Output subdirectory for generated skills relative to skill dir (default: '') */
  outputSubdir?: string;
}

export const HOST_CONFIGS: Record<Host, HostConfig> = {
  claude: {
    displayName: 'Claude Code',
    supportsAllowedTools: true,
    supportsMultilineDescription: true,
    paths: {
      skillRoot: '~/.claude/skills/pmstack',
      localSkillRoot: '.claude/skills/pmstack',
      binDir: '~/.claude/skills/pmstack/bin',
      browseDir: '~/.claude/skills/pmstack/browse/dist',
    },
  },
  cursor: {
    displayName: 'Cursor',
    supportsAllowedTools: false,
    supportsMultilineDescription: false,
    paths: {
      // Research gstack's hosts/cursor.ts for the correct Cursor path conventions
      // Cursor typically uses ~/.cursor/rules/ or a project-level .cursorrules
      // Fill these in after reading gstack's cursor.ts
      skillRoot: '~/.cursor/skills/pmstack',
      localSkillRoot: '.cursor/skills/pmstack',
      binDir: '~/.cursor/skills/pmstack/bin',
      browseDir: '~/.cursor/skills/pmstack/browse/dist',
    },
  },
  codex: {
    displayName: 'OpenAI Codex CLI',
    supportsAllowedTools: false,
    supportsMultilineDescription: false,
    paths: {
      // Research gstack's hosts/codex.ts for the correct Codex path conventions
      // Fill these in after reading gstack's codex.ts
      skillRoot: '~/.codex/skills/pmstack',
      localSkillRoot: '.codex/skills/pmstack',
      binDir: '~/.codex/skills/pmstack/bin',
      browseDir: '~/.codex/skills/pmstack/browse/dist',
    },
  },
};

// Keep HOST_PATHS as a convenience alias for backwards compatibility
export const HOST_PATHS: Record<Host, HostPaths> = Object.fromEntries(
  Object.entries(HOST_CONFIGS).map(([k, v]) => [k, v.paths])
) as Record<Host, HostPaths>;
```

### 2. `scripts/gen-skill-docs.ts` — accept a `--host` flag

**Current:** `const HOST = 'claude' as const;`

**Change:** Parse `--host` from `process.argv` and validate it against the `HOST_CONFIGS` keys.

Replace the current `HOST` constant with:
```typescript
import { HOST_CONFIGS } from './resolvers/types';

function parseHost(): Host {
  const idx = process.argv.indexOf('--host');
  if (idx !== -1 && process.argv[idx + 1]) {
    const requested = process.argv[idx + 1] as Host;
    if (!HOST_CONFIGS[requested]) {
      console.error(`Unknown host: ${requested}. Valid hosts: ${Object.keys(HOST_CONFIGS).join(', ')}`);
      process.exit(1);
    }
    return requested;
  }
  return 'claude'; // default
}

const HOST = parseHost();
```

Also update `processTemplate` to pass `HOST_CONFIGS[HOST]` into the `TemplateContext`:
```typescript
const ctx: TemplateContext = {
  skillName,
  tmplPath,
  benefitsFrom,
  host: HOST,
  paths: HOST_CONFIGS[HOST].paths,
  preambleTier,
  hostConfig: HOST_CONFIGS[HOST],   // add this — resolvers can use it for conditional output
};
```

And update `TemplateContext` in `types.ts` to include the optional `hostConfig` field:
```typescript
export interface TemplateContext {
  skillName: string;
  tmplPath: string;
  benefitsFrom?: string[];
  host: Host;
  paths: HostPaths;
  preambleTier?: number;
  hostConfig?: HostConfig;   // add this
}
```

For non-claude hosts, the generated output path should include the host name to avoid
overwriting the Claude versions. Update `processTemplate`:
```typescript
const outputPath = HOST === 'claude'
  ? tmplPath.replace(/\.tmpl$/, '')                    // original: SKILL.md
  : tmplPath.replace(/\.tmpl$/, `.${HOST}.md`);        // new: SKILL.cursor.md, SKILL.codex.md
```

### 3. `scripts/resolvers/preamble.ts` — strip host-incompatible content

The preamble bash block uses Claude-specific paths and the pmstack binary. For Cursor
and Codex, that bash block may not run at all (they do not execute preamble commands the
way Claude Code does). Use `ctx.hostConfig` to conditionally generate appropriate output.

Add a guard at the top of `generatePreambleBash`:
```typescript
function generatePreambleBash(ctx: TemplateContext): string {
  if (!ctx.hostConfig?.supportsAllowedTools) {
    // Cursor/Codex: no executable preamble block, just a comment
    return `<!-- Auto-generated for ${ctx.hostConfig?.displayName ?? ctx.host} -->\n<!-- State directory: ~/.pmstack/ -->\n<!-- Bin: ${ctx.paths.binDir} -->`;
  }
  // ... existing Claude preamble bash ...
}
```

Similarly, in `generateUpgradeCheck`, skip the manual upgrade instruction for non-claude
hosts (they won't see it the same way):
```typescript
function generateUpgradeCheck(ctx: TemplateContext): string {
  if (!ctx.hostConfig?.supportsAllowedTools) {
    return ''; // Non-Claude hosts: no upgrade check in the skill body
  }
  // ... existing upgrade check ...
}
```

### 4. `scripts/resolvers/types.ts` — strip `allowed-tools` from non-claude frontmatter

The frontmatter `allowed-tools:` field is Claude Code-specific. Other platforms either
ignore it or break on it. In `gen-skill-docs.ts`, after generating content, strip this
block for non-claude hosts:

```typescript
// Strip Claude-specific frontmatter fields for non-claude hosts
if (HOST !== 'claude') {
  content = content.replace(/^allowed-tools:[\s\S]*?(?=\n\S|\n---)/m, '');
}
```

### 5. `package.json` — add host-specific build scripts

```json
"scripts": {
  "gen:skill-docs": "bun run scripts/gen-skill-docs.ts",
  "gen:skill-docs:cursor": "bun run scripts/gen-skill-docs.ts --host cursor",
  "gen:skill-docs:codex": "bun run scripts/gen-skill-docs.ts --host codex",
  "gen:skill-docs:all": "bun run gen:skill-docs && bun run gen:skill-docs:cursor && bun run gen:skill-docs:codex",
  "build": "bun run gen:skill-docs:all && ..."
}
```

### 6. `setup` script — detect installed platforms and register skills

Add platform detection after the existing Claude Code install block (step 4):

```bash
# 5. Register for other installed platforms (if detected)
register_for_cursor() {
  local cursor_skills_dir="$HOME/.cursor/skills"
  if [ -d "$HOME/.cursor" ] || command -v cursor >/dev/null 2>&1; then
    mkdir -p "$cursor_skills_dir"
    ln -snf "$SOURCE_PMSTACK_DIR" "$cursor_skills_dir/pmstack"
    echo "Cursor detected — registered PMStack skills at $cursor_skills_dir/pmstack"
  fi
}

register_for_codex() {
  if command -v codex >/dev/null 2>&1; then
    # Research gstack's codex install strategy for exact paths
    echo "Codex CLI detected — see docs/ADDING_A_HOST.md for manual registration steps"
  fi
}

register_for_cursor
register_for_codex
```

Note: exact paths for Cursor and Codex skill registration should be confirmed by reading
gstack's `hosts/cursor.ts`, `hosts/codex.ts`, and `docs/ADDING_A_HOST.md` before
finalising.

### 7. `.gitignore` — ignore generated non-claude skill files

Add to `.gitignore` (or create it if absent):
```
# Host-specific generated skill files (source of truth is *.tmpl)
**/*.cursor.md
**/*.codex.md
```

Only the Claude versions (`SKILL.md`) should be committed — they are what users see when
browsing the repo. The non-claude variants are generated on the user's machine during setup.

## Build pipeline change

Currently `bun run gen:skill-docs` generates `SKILL.md` files and they are committed.
With multi-host, the Claude `SKILL.md` files continue to be committed (they are the
"source of truth" that users see on GitHub). The non-claude variants are generated during
`./setup` on the user's machine and not committed.

Update `setup` to run the host-specific generation step:
```bash
# After building the browse binary, regenerate host-specific skill docs
if command -v cursor >/dev/null 2>&1 || [ -d "$HOME/.cursor" ]; then
  echo "Generating Cursor skill files..."
  (cd "$SOURCE_PMSTACK_DIR" && bun run gen:skill-docs:cursor) 2>/dev/null || true
fi
```

## Scope notes

This plan covers the infrastructure to support multiple hosts. The actual content
changes needed inside each skill for non-Claude hosts (e.g., removing bash preamble
blocks, adapting output format) will vary by platform and should be driven by testing.
Start with Cursor as the first non-claude target — it is the most widely used alternative
and gstack has the most mature config for it.

Do not implement OpenClaw, Kiro, or other exotic hosts in the first pass. Cursor and
Codex are the meaningful targets for a PM toolkit audience.

## Testing

1. Run `bun run gen:skill-docs` — verify existing `SKILL.md` files are unchanged.
2. Run `bun run gen:skill-docs:cursor` — verify `SKILL.cursor.md` files are generated
   in each skill directory without overwriting `SKILL.md`.
3. Open one generated `SKILL.cursor.md` and verify: no `allowed-tools` frontmatter,
   no bash preamble block, paths correct for Cursor.
4. Run `bun run gen:skill-docs:cursor` twice — verify idempotent output.
5. Run `bun run skill:check` — verify existing checks still pass.
