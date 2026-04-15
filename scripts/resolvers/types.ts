import { ALL_HOST_CONFIGS } from '../../hosts/index';
import type { HostConfig } from '../host-config';

/**
 * Host type — corresponds to a registered host name in hosts/index.ts.
 * Adding a new host: create hosts/myhost.ts and add to hosts/index.ts.
 */
export type Host = string;

export interface HostPaths {
  skillRoot: string;
  localSkillRoot: string;
  binDir: string;
  browseDir: string;
}

/**
 * HOST_PATHS — derived from host configs at build time.
 * Non-Claude hosts use $PMSTACK_ROOT env vars (resolved at runtime by the host).
 */
function buildHostPaths(): Record<string, HostPaths> {
  const paths: Record<string, HostPaths> = {};
  for (const config of ALL_HOST_CONFIGS) {
    if (config.usesEnvVars) {
      paths[config.name] = {
        skillRoot: '$PMSTACK_ROOT',
        localSkillRoot: config.localSkillRoot,
        binDir: '$PMSTACK_BIN',
        browseDir: '$PMSTACK_BROWSE',
      };
    } else {
      const root = `~/${config.globalRoot}`;
      paths[config.name] = {
        skillRoot: root,
        localSkillRoot: config.localSkillRoot,
        binDir: `${root}/bin`,
        browseDir: `${root}/browse/dist`,
      };
    }
  }
  return paths;
}

export const HOST_PATHS: Record<string, HostPaths> = buildHostPaths();

export interface TemplateContext {
  skillName: string;
  tmplPath: string;
  benefitsFrom?: string[];
  host: Host;
  paths: HostPaths;
  preambleTier?: number;  // 1-4, controls which preamble sections are included
  hostConfig?: HostConfig; // present for all hosts; used for conditional generation
}
