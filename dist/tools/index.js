/**
 * Tools index - exports all tool groups
 */
import { creativeGroup } from './creative.js';
import { tiktokGroup } from './tiktok.js';
import { tiktokShopGroup } from './tiktokShop.js';
import { keepaGroup } from './keepa.js';
import { scraperGroup } from './scraper.js';
import { chatGroup } from './chat.js';
/**
 * All available tool groups.
 *
 * Order matters only for the order tools appear in tools/list, which some
 * clients use as a hint when building the tool prompt.
 */
export const ALL_TOOL_GROUPS = [
    creativeGroup,
    tiktokShopGroup,
    tiktokGroup,
    keepaGroup,
    scraperGroup,
    chatGroup,
];
/**
 * Get tool definitions filtered by enabled groups.
 *
 * Deduplicates by tool name: a user may enable overlapping selectors (for
 * example the legacy `tiktok` alias plus an explicit `tiktok-shop`), and the
 * same tool must never be listed twice — clients reject duplicate names.
 */
export function getEnabledTools(enabledGroups) {
    const seen = new Set();
    const tools = [];
    for (const group of ALL_TOOL_GROUPS) {
        if (!enabledGroups.has(group.group))
            continue;
        for (const tool of group.register()) {
            if (seen.has(tool.name))
                continue;
            seen.add(tool.name);
            tools.push(tool);
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