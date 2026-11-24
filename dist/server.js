#!/usr/bin/env node
/**
 * AIBotSpace MCP Server
 *
 * Provides 64 tools across 6 groups. Load only what you need with `--preset`:
 *
 *   creative       image & video generation                 (5 tools)
 *   tiktok-shop    own shop: auth, publish, orders, ship    (25 tools)
 *   tiktok-research market data: products, shops, videos    (8 tools)
 *   keepa          Amazon market research                   (13 tools)
 *   scraper        web scraping via Bright Data             (10 tools)
 *   chat           HERMES AI conversation                   (3 tools)
 *
 * Presets: all (default) | shop | research | video | scrape | chat
 *
 * Usage:
 *   AIBOTSPACE_API_KEY=sk-aibot-xxx npx @aibotspace/mcp-server --preset shop
 *
 * Claude Code config (settings.json):
 *   {
 *     "mcpServers": {
 *       "aibotspace-shop": {
 *         "command": "npx",
 *         "args": ["-y", "@aibotspace/mcp-server", "--preset", "shop"],
 *         "env": {
 *           "AIBOTSPACE_API_KEY": "sk-aibot-xxx"
 *         }
 *       }
 *     }
 *   }
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from './zodCompatible.js';
import { loadConfig } from './config.js';
import { AibotSpaceClient } from './client.js';
import { getEnabledTools, getGroupInfo } from './tools/index.js';
// ─── Bootstrap ──────────────────────────────────
const config = loadConfig();
const client = new AibotSpaceClient(config);
const tools = getEnabledTools(config.enabledGroups);
const server = new Server({ name: 'aibotspace-mcp', version: '1.0.0' }, { capabilities: { tools: {} } });
// ─── List Tools ──────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: zodToJsonSchema(t.inputSchema),
        })),
    };
});
// ─── Call Tool ──────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const tool = tools.find((t) => t.name === name);
    if (!tool) {
        return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
        };
    }
    // Validate input with Zod
    const parsed = tool.inputSchema.safeParse(args || {});
    if (!parsed.success) {
        return {
            content: [{
                    type: 'text',
                    text: `Invalid parameters: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`,
                }],
            isError: true,
        };
    }
    try {
        const result = await tool.handler(parsed.data, client, config);
        return {
            content: [{ type: 'text', text: result }],
        };
    }
    catch (err) {
        const message = err?.message || 'Unknown error';
        const statusCode = err?.statusCode ? ` (HTTP ${err.statusCode})` : '';
        return {
            content: [{
                    type: 'text',
                    text: `Error: ${message}${statusCode}\n\nIf this is an auth error, check your AIBOTSPACE_API_KEY.`,
                }],
            isError: true,
        };
    }
});
// ─── Start ──────────────────────────────────
async function main() {
    const groupInfo = getGroupInfo().filter((g) => config.enabledGroups.has(g.group));
    const totalTools = groupInfo.reduce((sum, g) => sum + g.toolCount, 0);
    // Rough context cost of the tool definitions this session will load.
    // ~3.8 chars per token for JSON with mostly-English text.
    let payloadChars = 0;
    for (const t of tools) {
        payloadChars += JSON.stringify({
            name: t.name,
            description: t.description,
            inputSchema: zodToJsonSchema(t.inputSchema),
        }).length;
    }
    const approxTokens = Math.round(payloadChars / 3.8);
    console.error(`[aibotspace-mcp] Starting...`);
    console.error(`[aibotspace-mcp] API: ${config.baseUrl}`);
    console.error(`[aibotspace-mcp] Groups: ${groupInfo.map((g) => `${g.group} (${g.toolCount})`).join(', ')}`);
    console.error(`[aibotspace-mcp] Total tools: ${totalTools}`);
    console.error(`[aibotspace-mcp] Tool definitions: ~${approxTokens} tokens` +
        (totalTools === 64 ? ' (all groups; use --preset to load fewer)' : ''));
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[aibotspace-mcp] Server running on stdio');
}
main().catch((err) => {
    console.error('[aibotspace-mcp] Fatal error:', err);
    process.exit(1);
});
//# sourceMappingURL=server.js.map