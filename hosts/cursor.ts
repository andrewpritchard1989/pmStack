import type { HostConfig } from '../scripts/host-config';

const cursor: HostConfig = {
  name: 'cursor',
  displayName: 'Cursor',
  cliCommand: 'cursor',
  cliAliases: [],

  globalRoot: '.cursor/skills/pmstack',
  localSkillRoot: '.cursor/skills/pmstack',
  usesEnvVars: true, // paths in content use $PMSTACK_ROOT

  frontmatter: {
    mode: 'allowlist',
    keepFields: ['name', 'description'], // Cursor doesn't use allowed-tools, preamble-tier, etc.
    descriptionLimit: null,
  },

  pathRewrites: [
    { from: '~/.claude/skills/pmstack', to: '~/.cursor/skills/pmstack' },
    { from: '.claude/skills/pmstack', to: '.cursor/skills/pmstack' },
    { from: '.claude/skills', to: '.cursor/skills' },
  ],

  install: {
    prefixable: false,
    linkingStrategy: 'symlink-generated',
  },
};

export default cursor;
