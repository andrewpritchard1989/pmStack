import type { HostConfig } from '../scripts/host-config';

const claude: HostConfig = {
  name: 'claude',
  displayName: 'Claude Code',
  cliCommand: 'claude',
  cliAliases: [],

  globalRoot: '.claude/skills/pmstack',
  localSkillRoot: '.claude/skills/pmstack',
  usesEnvVars: false, // Claude uses literal ~ paths

  frontmatter: {
    mode: 'denylist',
    stripFields: [], // Claude keeps all frontmatter fields
  },

  pathRewrites: [], // Claude is the canonical source — no rewrites needed

  install: {
    prefixable: false,
    linkingStrategy: 'symlink-generated',
  },
};

export default claude;
