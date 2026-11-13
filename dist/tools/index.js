/**
 * Tools index - exports all tool groups
 */
import { creativeGroup } from './creative.js';
import { tiktokGroup } from './tiktok.js';
import { keepaGroup } from './keepa.js';
import { scraperGroup } from './scraper.js';
import { chatGroup } from './chat.js';
/**
 * All available tool groups
 */
export const ALL_TOOL_GROUPS = [
    creativeGroup,
    tiktokGroup,
    keepaGroup,
    scraperGroup,
    chatGroup,
];
/**
 * Get tool definitions filtered by enabled groups
 */
export function getEnabledTools(enabledGroups) {
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
//# sourceMappingURL=index.js.map