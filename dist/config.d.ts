/**
 * AIBotSpace MCP Server - Configuration
 *
 * Tool groups can be selected in three ways, in priority order:
 *   1. CLI flag:      --preset shop        (or --preset=shop, --preset shop,video)
 *   2. Environment:   AIBOTSPACE_PRESET=shop
 *   3. Environment:   ENABLE_GROUPS=tiktok-shop,creative
 * If none is set, every group is enabled.
 */
export interface Config {
    apiKey: string;
    baseUrl: string;
    enabledGroups: Set<string>;
    preset: string | null;
    logLevel: string;
}
/** Fine-grained group ids. Each maps to one ToolGroupModule. */
export declare const ALL_GROUPS: readonly ["creative", "tiktok-research", "tiktok-shop", "keepa", "scraper", "chat"];
export type ToolGroup = (typeof ALL_GROUPS)[number];
/**
 * Named bundles. These are what users actually type, so keep the names short
 * and mapped to a use case rather than to an internal module name.
 */
export declare const PRESETS: Record<string, string[]>;
export declare const PRESET_NAMES: string[];
/**
 * Resolve a preset spec like "shop" or "shop,video" into group ids.
 * Unknown names are reported instead of silently enabling everything.
 */
export declare function resolvePreset(spec: string): {
    groups: string[];
    unknown: string[];
};
export declare function resolveEnabledGroups(): {
    groups: Set<string>;
    preset: string | null;
    source: string;
};
export declare function loadConfig(): Config;
//# sourceMappingURL=config.d.ts.map