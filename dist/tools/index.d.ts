/**
 * Tools index - exports all tool groups
 */
import type { ToolDefinition, ToolGroupModule } from './register.js';
export type { ToolDefinition, ToolGroupModule, ToolParam } from './register.js';
/**
 * All available tool groups.
 *
 * Order matters only for the order tools appear in tools/list, which some
 * clients use as a hint when building the tool prompt.
 */
export declare const ALL_TOOL_GROUPS: ToolGroupModule[];
/**
 * Get tool definitions filtered by enabled groups.
 *
 * Deduplicates by tool name: a user may enable overlapping selectors (for
 * example the legacy `tiktok` alias plus an explicit `tiktok-shop`), and the
 * same tool must never be listed twice — clients reject duplicate names.
 */
export declare function getEnabledTools(enabledGroups: Set<string>): ToolDefinition[];
/**
 * Get group info for display
 */
export declare function getGroupInfo(): {
    group: string;
    label: string;
    toolCount: number;
}[];
//# sourceMappingURL=index.d.ts.map