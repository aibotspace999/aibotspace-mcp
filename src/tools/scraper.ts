/**
 * Bright Data tools - web scraping & data collection
 *
 * Calls AIBotSpace internal endpoint:
 *   POST /api/v1/scraper/call
 *
 * Routes to different Bright Data datasets based on tool name
 */

import { z } from 'zod';
import type { ToolDefinition, ToolGroupModule } from './register.js';
import type { AibotSpaceClient } from '../client.js';

async function callBrightData(toolName: string, params: Record<string, any>, client: AibotSpaceClient) {
  return client.post('/api/v1/scraper/call', { toolName, params });
}

// ─── Generic Web Scraper ──────────────────────────────

const scrapeWeb: ToolDefinition = {
  name: 'aibot_scrape_web',
  description: 'Scrape any webpage and extract content as markdown/text. Works with any publicly accessible URL.',
  group: 'scraper',
  inputSchema: z.object({
    url: z.string().url().describe('URL to scrape'),
  }),
  handler: async (params, client) => {
    const result = await callBrightData('web_scraper', params, client);
    return JSON.stringify(result, null, 2);
  },
};

// ─── Amazon Product Scraper ──────────────────────────────

const scrapeAmazonProduct: ToolDefinition = {
  name: 'aibot_scrape_amazon_product',
  description: 'Scrape Amazon product detail page. Returns title, price, brand, rating, images, features, description, variations.',
  group: 'scraper',
  inputSchema: z.object({
    url: z.string().url().describe('Amazon product URL (e.g. https://www.amazon.com/dp/B0XXX)'),
  }),
  handler: async (params, client) => {
    const result = await callBrightData('web_data_amazon_product', params, client);
    return JSON.stringify(result, null, 2);
  },
};

// ─── Amazon Search Scraper ──────────────────────────────

const scrapeAmazonSearch: ToolDefinition = {
  name: 'aibot_scrape_amazon_search',
  description: 'Search Amazon products with rich filters: keyword, price range, rating, Prime, deals, brand, category, sort order.',
  group: 'scraper',
  inputSchema: z.object({
    keyword: z.string().describe('Search keyword'),
    url: z.string().optional().describe('Amazon domain (default: https://www.amazon.com)'),
    sort: z.string().optional().describe('Sort: review-rank, price-desc-alias, price-asc-alias, date-desc-rank, sales-rank'),
    page: z.number().int().optional().describe('Page number'),
    min_rating: z.number().optional().describe('Min rating (1-5)'),
    price_min: z.number().optional().describe('Min price in dollars'),
    price_max: z.number().optional().describe('Max price in dollars'),
    brand: z.string().optional(),
    new_only: z.boolean().optional(),
    prime_only: z.boolean().optional(),
    deals_only: z.boolean().optional(),
    pages_to_search: z.number().int().optional().default(1).describe('How many pages to scrape'),
  }),
  handler: async (params, client) => {
    const result = await callBrightData('web_data_amazon_product_search', params, client);
    return JSON.stringify(result, null, 2);
  },
};

// ─── Amazon Reviews Scraper ──────────────────────────────

const scrapeAmazonReviews: ToolDefinition = {
  name: 'aibot_scrape_amazon_reviews',
  description: 'Scrape Amazon product reviews. Returns review text, rating, date, verified purchase status.',
  group: 'scraper',
  inputSchema: z.object({
    url: z.string().url().describe('Amazon product URL'),
  }),
  handler: async (params, client) => {
    const result = await callBrightData('web_data_amazon_product_reviews', params, client);
    return JSON.stringify(result, null, 2);
  },
};

// ─── TikTok Shop Scraper ──────────────────────────────

const scrapeTikTokShop: ToolDefinition = {
  name: 'aibot_scrape_tiktok_shop',
  description: 'Scrape TikTok Shop product details.',
  group: 'scraper',
  inputSchema: z.object({
    url: z.string().url().describe('TikTok Shop product URL'),
  }),
  handler: async (params, client) => {
    const result = await callBrightData('web_data_tiktok_shop', params, client);
    return JSON.stringify(result, null, 2);
  },
};

// ─── Social Media Scraper ──────────────────────────────

const scrapeSocialMedia: ToolDefinition = {
  name: 'aibot_scrape_social_media',
  description: `Scrape social media profiles and posts.
Auto-detects platform from URL (Instagram/LinkedIn/Twitter/Facebook).
Returns profile data, post content, follower counts, engagement metrics.`,
  group: 'scraper',
  inputSchema: z.object({
    url: z.string().url().describe('Social media URL (Instagram/LinkedIn/Twitter/Facebook)'),
    platform: z.enum(['instagram', 'linkedin', 'twitter', 'facebook']).optional().describe('Override auto-detection'),
  }),
  handler: async (params, client) => {
    const result = await callBrightData('social_media_scraper', params, client);
    return JSON.stringify(result, null, 2);
  },
};

// ─── E-commerce Universal Scraper ──────────────────────────────

const scrapeEcommerce: ToolDefinition = {
  name: 'aibot_scrape_ecommerce',
  description: `Universal e-commerce scraper. Auto-detects platform from URL (Amazon/Walmart/eBay/TikTok).
Returns product data appropriate for the detected platform.`,
  group: 'scraper',
  inputSchema: z.object({
    url: z.string().url().describe('Product page URL'),
    platform: z.enum(['amazon', 'walmart', 'ebay', 'tiktok']).optional().describe('Override auto-detection'),
  }),
  handler: async (params, client) => {
    const result = await callBrightData('ecommerce_scraper', params, client);
    return JSON.stringify(result, null, 2);
  },
};

// ─── Walmart Price Scraper ──────────────────────────────

const scrapeWalmart: ToolDefinition = {
  name: 'aibot_scrape_walmart',
  description: 'Scrape Walmart product price and details.',
  group: 'scraper',
  inputSchema: z.object({
    url: z.string().url().describe('Walmart product URL'),
  }),
  handler: async (params, client) => {
    const result = await callBrightData('ecommerce_scraper', { ...params, platform: 'walmart' }, client);
    return JSON.stringify(result, null, 2);
  },
};

// ─── eBay Scraper ──────────────────────────────

const scrapeEbay: ToolDefinition = {
  name: 'aibot_scrape_ebay',
  description: 'Scrape eBay product listing details.',
  group: 'scraper',
  inputSchema: z.object({
    url: z.string().url().describe('eBay product URL'),
  }),
  handler: async (params, client) => {
    const result = await callBrightData('ecommerce_scraper', { ...params, platform: 'ebay' }, client);
    return JSON.stringify(result, null, 2);
  },
};

// ─── Dataset List (admin/discovery) ──────────────────────────────

const listDatasets: ToolDefinition = {
  name: 'aibot_scrape_list_datasets',
  description: 'List all available Bright Data datasets. Useful for discovering new scraping capabilities.',
  group: 'scraper',
  inputSchema: z.object({}),
  handler: async (_params, client) => {
    const result = await client.post('/desktop/data-api/brightdata/list', {});
    return JSON.stringify(result, null, 2);
  },
};

// ─── Group ──────────────────────────────────────────

export const scraperGroup: ToolGroupModule = {
  group: 'scraper',
  label: 'Web Scraping & Data Collection (Bright Data)',
  register() {
    return [
      scrapeWeb, scrapeAmazonProduct, scrapeAmazonSearch, scrapeAmazonReviews,
      scrapeTikTokShop, scrapeSocialMedia, scrapeEcommerce,
      scrapeWalmart, scrapeEbay, listDatasets,
    ];
  },
};
