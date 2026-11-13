/**
 * Tools index - exports all tool groups
 */
import type { ToolGroupModule } from './register.js';
export type { ToolDefinition, ToolGroupModule, ToolParam } from './register.js';
/**
 * All available tool groups
 */
export declare const ALL_TOOL_GROUPS: ToolGroupModule[];
/**
 * Get tool definitions filtered by enabled groups
 */
export declare function getEnabledTools(enabledGroups: Set<string>): import("./register.js").ToolDefinition[];
/**
 * Get group info for display
 */
export declare function getGroupInfo(): {
    group: string;
    label: string;
    toolCount: number;
}[];
//# sourceMappingURL=index.d.ts.map