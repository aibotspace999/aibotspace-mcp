#!/usr/bin/env node

/**
 * AIBotSpace MCP Server
 *
 * Provides 39 tools across 5 groups:
 *   - creative:  AI image & video generation (5 tools)
 *   - tiktok:    TikTok Shop analytics via FastMoss (8 tools)
 *   - keepa:     Amazon market research via Keepa (13 tools)
 *   - scraper:   Web scraping via Bright Data (10 tools)
 *   - chat:      HERMES AI conversation (3 tools)
 *
 * Usage:
 *   AIBOTSPACE_API_KEY=sk-aibot-xxx npx @aibotspace/mcp-server
 *
 * Claude Code config (settings.json):
 *   {
 *     "mcpServers": {
 *       "aibotspace": {
 *         "command": "npx",
 *         "args": ["-y", "@aibotspace/mcp-server"],
 *         "env": {
 *           "AIBOTSPACE_API_KEY": "sk-aibot-xxx"
 *         }
 *       }
 *     }
 *   }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from './zodCompatible.js';

import { loadConfig, ALL_GROUPS } from './config.js';
import { AibotSpaceClient } from './client.js';
import { getEnabledTools, getGroupInfo } from './tools/index.js';

// ─── Bootstrap ──────────────────────────────────

const config = loadConfig();
const client = new AibotSpaceClient(config);
const tools = getEnabledTools(config.enabledGroups);

const server = new Server(
  { name: 'aibotspace-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

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
  } catch (err: any) {
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

  console.error(`[aibotspace-mcp] Starting...`);
  console.error(`[aibotspace-mcp] API: ${config.baseUrl}`);
  console.error(`[aibotspace-mcp] Groups: ${groupInfo.map((g) => `${g.label} (${g.toolCount})`).join(', ')}`);
  console.error(`[aibotspace-mcp] Total tools: ${totalTools}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[aibotspace-mcp] Server running on stdio');
}

main().catch((err) => {
  console.error('[aibotspace-mcp] Fatal error:', err);
  process.exit(1);
});
