/**
 * AIBotSpace MCP Server - Configuration
 */
export interface Config {
    apiKey: string;
    baseUrl: string;
    enabledGroups: Set<string>;
    logLevel: string;
}
export declare const ALL_GROUPS: readonly ["creative", "tiktok", "keepa", "scraper", "chat"];
export type ToolGroup = (typeof ALL_GROUPS)[number];
export declare function loadConfig(): Config;
//# sourceMappingURL=config.d.ts.map