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

export interface TemplateContext {
  skillName: string;
  tmplPath: string;
  benefitsFrom?: string[];
  host: Host;
  paths: HostPaths;
  preambleTier?: number;  // 1-4, controls which preamble sections are included
}
