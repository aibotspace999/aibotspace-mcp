/**
 * Tools index - exports all tool groups
 */

import type { ToolGroupModule } from './register.js';

import { creativeGroup } from './creative.js';
import { tiktokGroup } from './tiktok.js';
import { keepaGroup } from './keepa.js';
import { scraperGroup } from './scraper.js';
import { chatGroup } from './chat.js';

export type { ToolDefinition, ToolGroupModule, ToolParam } from './register.js';

/**
 * All available tool groups
 */
export const ALL_TOOL_GROUPS: ToolGroupModule[] = [
  creativeGroup,
  tiktokGroup,
  keepaGroup,
  scraperGroup,
  chatGroup,
];

/**
 * Get tool definitions filtered by enabled groups
 */
export function getEnabledTools(enabledGroups: Set<string>) {
  const tools = [];
  for (const group of ALL_TOOL_GROUPS) {
    if (enabledGroups.has(group.group)) {
      tools.push(...group.register());
    }
  }
  return tools;
}

/**
 * Get group info for display
 */
export function getGroupInfo() {
  return ALL_TOOL_GROUPS.map((g) => ({
    group: g.group,
    label: g.label,
    toolCount: g.register().length,
  }));
}
