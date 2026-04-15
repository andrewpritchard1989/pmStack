/**
 * Host config registry.
 *
 * To add a new host:
 *   1. Create hosts/myhost.ts
 *   2. Import here and add to ALL_HOST_CONFIGS
 *   3. Re-export at the bottom
 */

import type { HostConfig } from '../scripts/host-config';
import claude from './claude';
import cursor from './cursor';

/** All registered host configs. Add new hosts here. */
export const ALL_HOST_CONFIGS: HostConfig[] = [claude, cursor];

/** Map from host name to config. */
export const HOST_CONFIG_MAP: Record<string, HostConfig> = Object.fromEntries(
  ALL_HOST_CONFIGS.map(c => [c.name, c])
);

/** All host names as a string array (for CLI arg validation). */
export const ALL_HOST_NAMES: string[] = ALL_HOST_CONFIGS.map(c => c.name);

/** Get a host config by name. Throws if not found. */
export function getHostConfig(name: string): HostConfig {
  const config = HOST_CONFIG_MAP[name];
  if (!config) {
    throw new Error(`Unknown host '${name}'. Valid hosts: ${ALL_HOST_NAMES.join(', ')}`);
  }
  return config;
}

/**
 * Resolve a host name from a CLI argument, handling aliases.
 * e.g. 'agents' → 'codex' (if codex were registered)
 */
export function resolveHostArg(arg: string): string {
  if (HOST_CONFIG_MAP[arg]) return arg;
  for (const config of ALL_HOST_CONFIGS) {
    if (config.cliAliases?.includes(arg)) return config.name;
  }
  throw new Error(`Unknown host '${arg}'. Valid hosts: ${ALL_HOST_NAMES.join(', ')}`);
}

/** Get all non-Claude hosts (the ones that need generated skill docs). */
export function getExternalHosts(): HostConfig[] {
  return ALL_HOST_CONFIGS.filter(c => c.name !== 'claude');
}

export { claude, cursor };
