/**
 * AIBotSpace MCP Server - Configuration
 */

export interface Config {
  apiKey: string;
  baseUrl: string;
  enabledGroups: Set<string>;
  logLevel: string;
}

export const ALL_GROUPS = ['creative', 'tiktok', 'keepa', 'scraper', 'chat'] as const;
export type ToolGroup = (typeof ALL_GROUPS)[number];

export function loadConfig(): Config {
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
