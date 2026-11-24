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
export {};
//# sourceMappingURL=server.d.ts.map