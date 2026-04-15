/**
 * HostConfig interface — defines what a PMStack host needs.
 *
 * To add a new host:
 *   1. Create hosts/{name}.ts implementing HostConfig
 *   2. Register in hosts/index.ts
 *   3. Add to .gitignore: **‌/*.{name}.md
 *   4. Run: bun run gen:skill-docs --host {name}
 */

export interface PathRewrite {
  /** Literal string to find in generated content */
  from: string;
  /** Replacement string */
  to: string;
}

export interface FrontmatterConfig {
  /**
   * 'allowlist' — keep only fields listed in keepFields.
   * 'denylist'  — strip fields listed in stripFields, keep everything else.
   */
  mode: 'allowlist' | 'denylist';
  /** Fields to keep (allowlist mode) */
  keepFields?: string[];
  /** Fields to strip (denylist mode) */
  stripFields?: string[];
  /**
   * Max characters for the description field.
   * null = no limit. If exceeded, build fails.
   */
  descriptionLimit?: number | null;
}

export interface HostConfig {
  /** Unique lowercase identifier, e.g. 'claude', 'cursor' */
  name: string;
  /** Human-readable name for output messages */
  displayName: string;
  /** Binary name used for `command -v` detection during setup */
  cliCommand: string;
  /** Alternative binary names (e.g. ['agents'] for codex) */
  cliAliases?: string[];

  /**
   * Path to skill root relative to ~.
   * e.g. '.cursor/skills/pmstack' → installed at ~/.cursor/skills/pmstack
   */
  globalRoot: string;
  /**
   * Project-local skill root, relative to project root.
   * Used for --local installs and in path rewrites.
   */
  localSkillRoot: string;
  /**
   * Whether skill content should use $PMSTACK_ROOT env vars instead of
   * literal ~/.claude paths. Set true for all non-Claude hosts.
   */
  usesEnvVars: boolean;

  /** How to filter frontmatter fields in generated output */
  frontmatter: FrontmatterConfig;

  /**
   * String replacements applied to the full generated content (in order).
   * Rewrites .claude/ paths to host-specific equivalents.
   */
  pathRewrites: PathRewrite[];

  /**
   * Resolver placeholder names that return '' for this host.
   * Use for Claude-only resolvers (bash blocks, Claude-specific tool refs).
   */
  suppressedResolvers?: string[];

  install: {
    /** Whether to add a host prefix to skill names during install */
    prefixable: boolean;
    linkingStrategy: 'symlink-generated' | 'copy';
  };
}
