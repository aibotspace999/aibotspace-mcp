/**
 * AIBotSpace MCP Server - Configuration
 */
export const ALL_GROUPS = ['creative', 'tiktok', 'keepa', 'scraper', 'chat'];
export function loadConfig() {
    const apiKey = process.env.AIBOTSPACE_API_KEY || '';
    if (!apiKey) {
        console.error('[aibotspace-mcp] ERROR: AIBOTSPACE_API_KEY is required');
        console.error('[aibotspace-mcp] Get your key at https://aibotspace.com');
        process.exit(1);
    }
    const baseUrl = (process.env.AIBOTSPACE_BASE_URL || 'https://aibotspace.com').replace(/\/+$/, '');
    const groupsRaw = process.env.ENABLE_GROUPS || '';
    const enabledGroups = groupsRaw
        ? new Set(groupsRaw.split(',').map((s) => s.trim()).filter(Boolean))
        : new Set(ALL_GROUPS);
    return {
        apiKey,
        baseUrl,
        enabledGroups,
        logLevel: process.env.LOG_LEVEL || 'info',
    };
}
//# sourceMappingURL=config.js.map