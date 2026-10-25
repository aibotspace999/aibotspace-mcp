/**
 * Keepa tools - Amazon market research & analytics
 *
 * Calls AIBotSpace internal endpoint:
 *   POST /api/v1/keepa/call
 *
 * 13 Keepa endpoints mapped to MCP tools
 */

import { z } from 'zod';
import type { ToolDefinition, ToolGroupModule } from './register.js';
import type { AibotSpaceClient } from '../client.js';

const DomainSchema = z.union([z.number(), z.string()]).optional().default(1)
  .describe('Amazon site: 1=US, 2=UK, 3=DE, 4=FR, 5=JP, 6=CA, 7=IT, 8=ES, 9=IN, 10=MX, 11=BR, 12=AU');

async function callKeepa(toolName: string, params: Record<string, any>, client: AibotSpaceClient) {
  return client.post('/api/v1/keepa/call', { toolName, params });
}

// ─── 1. Product Detail (price history) ──────────────

const keepaProduct: ToolDefinition = {
  name: 'aibot_keepa_product',
  description: `Get Amazon product details with full price/sales history by ASIN.
Returns: title, brand, current price, historical prices (Amazon/New/Used/BuyBox), BSR history, rating, review count, monthly sales, variations, FBA/FBM offer counts.
Supports up to 20 ASINs per call (auto-batched).`,
  group: 'keepa',
  inputSchema: z.object({
    asins: z.union([z.string(), z.array(z.string())]).describe('ASIN(s): single "B0XXX" or array ["B0XX","B0YY"]'),
    domain: DomainSchema,
    stats: z.number().optional().describe('Statistics days (30/90/180/365), 0=none'),
    stock: z.boolean().optional().describe('Include real-time stock'),
    rating: z.boolean().optional().describe('Include rating/review history'),
    bsr: z.boolean().optional().describe('Include BSR history'),
  }),
  handler: async (params, client) => {
    const result = await callKeepa('product', params, client);
    return JSON.stringify(result, null, 2);
  },
};

// ─── 2. Product Finder (blue ocean selection) ──────────────

const keepaProductFinder: ToolDefinition = {
  name: 'aibot_keepa_finder',
  description: `★ Amazon Product Finder - the most powerful Keepa tool.
Filter Amazon products by 50+ criteria to find blue ocean opportunities.
Examples: BSR < 50000, price $15-$50, reviews < 50, monthly sales > 100, Prime eligible.
Returns ASIN list sorted by your criteria.`,
  group: 'keepa',
  inputSchema: z.object({
    domain: DomainSchema,
    category: z.union([z.number(), z.array(z.number())]).optional().describe('Root category ID(s)'),
    min_salesRank_30d: z.number().optional().describe('Min avg 30d BSR'),
    max_salesRank_30d: z.number().optional().describe('Max avg 30d BSR (lower = better selling)'),
    min_price: z.number().optional().describe('Min price in cents (e.g. 1500 = $15)'),
    max_price: z.number().optional().describe('Max price in cents'),
    min_reviewCount: z.number().optional().describe('Min review count'),
    max_reviewCount: z.number().optional().describe('Max review count (low = less competition)'),
    min_monthlySales: z.number().optional().describe('Min monthly sales'),
    min_rating: z.number().optional().describe('Min rating (0-50, e.g. 40 = 4 stars)'),
    isPrimeEligible: z.boolean().optional(),
    isFBA: z.boolean().optional(),
    sort: z.number().optional().describe('Sort: 0=BSR, 2=price, 4=rank improvement 30d, 5=reviews, 6=listing date, 7=monthly sales'),
    page: z.number().int().optional().default(0),
    perPage: z.number().int().optional().default(50).describe('Results per page (min 50)'),
    totalPages: z.number().int().optional().default(1).describe('Total pages to fetch'),
    title: z.string().optional().describe('Title keyword filter'),
    listedSince: z.number().optional().describe('Listed within N days'),
  }),
  handler: async (params, client) => {
    const result = await callKeepa('query', params, client);
    return JSON.stringify(result, null, 2);
  },
};

// ─── 3. Best Sellers ──────────────

const keepaBestsellers: ToolDefinition = {
  name: 'aibot_keepa_bestsellers',
  description: 'Get Amazon Best Sellers (Top 100 ASINs) for a specific category.',
  group: 'keepa',
  inputSchema: z.object({
    category: z.number().describe('Category ID (required)'),
    domain: DomainSchema,
  }),
  handler: async (params, client) => {
    const result = await callKeepa('bestsellers', params, client);
    return JSON.stringify(result, null, 2);
  },
};

// ─── 4. Category Tree ──────────────

const keepaCategory: ToolDefinition = {
  name: 'aibot_keepa_category',
  description: 'Get Amazon category tree with subcategories, names, and product counts.',
  group: 'keepa',
  inputSchema: z.object({
    category: z.number().describe('Category ID (0 = root category)'),
    domain: DomainSchema,
    parents: z.boolean().optional().describe('Include parent category chain'),
  }),
  handler: async (params, client) => {
    const result = await callKeepa('category', params, client);
    return JSON.stringify(result, null, 2);
  },
};

// ─── 4b. Category Search ──────────────

const keepaCategorySearch: ToolDefinition = {
  name: 'aibot_keepa_category_search',
  description: 'Search Amazon categories by keyword. Find category IDs by name. Only 1 token per search.',
  group: 'keepa',
  inputSchema: z.object({
    term: z.string().describe('Category name keyword (e.g. "home", "electronics")'),
    domain: DomainSchema,
  }),
  handler: async (params, client) => {
    const result = await callKeepa('categorysearch', params, client);
    return JSON.stringify(result, null, 2);
  },
};

// ─── 5. Keyword Search ──────────────

const keepaSearch: ToolDefinition = {
  name: 'aibot_keepa_search',
  description: 'Search Amazon products by keyword. Returns product details (title, price, BSR, monthly sales) for up to 20 results.',
  group: 'keepa',
  inputSchema: z.object({
    term: z.string().describe('Search keyword'),
    domain: DomainSchema,
    type: z.enum(['product', 'category']).optional().default('product'),
  }),
  handler: async (params, client) => {
    const result = await callKeepa('search', params, client);
    return JSON.stringify(result, null, 2);
  },
};

// ─── 6. Deals ──────────────

const keepaDeals: ToolDefinition = {
  name: 'aibot_keepa_deals',
  description: 'Browse Amazon current deals and promotions. Filter by discount %, price range, category, rating.',
  group: 'keepa',
  inputSchema: z.object({
    domain: DomainSchema,
    page: z.number().int().optional().default(0).describe('Page (150 deals per page)'),
    minDiscountPercent: z.number().optional().describe('Minimum discount %'),
    minPrice: z.number().optional().describe('Min price in cents'),
    maxPrice: z.number().optional().describe('Max price in cents'),
    isLowest: z.boolean().optional().describe('Historical lowest price only'),
    hasReviews: z.boolean().optional(),
    minRating: z.number().optional().describe('Min rating (0-50, e.g. 40 = 4 stars)'),
    titleSearch: z.string().optional().describe('Title keyword filter'),
    sortType: z.number().optional().describe('0=discount, 1=price, 2=BSR'),
    dateRange: z.number().optional().describe('0=Day, 1=Week, 2=Month, 3=3Months'),
  }),
  handler: async (params, client) => {
    const result = await callKeepa('deal', params, client);
    return JSON.stringify(result, null, 2);
  },
};

// ─── 7. Lightning Deals ──────────────

const keepaLightning: ToolDefinition = {
  name: 'aibot_keepa_lightning',
  description: 'Query Amazon Lightning Deals. Single ASIN (1 token, recommended) or full list (500 tokens).',
  group: 'keepa',
  inputSchema: z.object({
    domain: DomainSchema,
    asin: z.string().optional().describe('ASIN for single deal lookup (1 token, strongly recommended)'),
    state: z.enum(['AVAILABLE', 'WAITLIST', 'SOLDOUT', 'EXPIRED']).optional().describe('Filter by state (full list only)'),
  }),
  handler: async (params, client) => {
    const result = await callKeepa('lightningdeal', params, client);
    return JSON.stringify(result, null, 2);
  },
};

// ─── 8. Seller Info ──────────────

const keepaSeller: ToolDefinition = {
  name: 'aibot_keepa_seller',
  description: 'Get Amazon seller information: store name, rating, product count, address, feedback.',
  group: 'keepa',
  inputSchema: z.object({
    sellers: z.union([z.string(), z.array(z.string())]).describe('Seller ID(s), e.g. "A1XXXXXX" or ["A1XX","A2XX"]'),
    domain: DomainSchema,
  }),
  handler: async (params, client) => {
    const result = await callKeepa('seller', params, client);
    return JSON.stringify(result, null, 2);
  },
};

// ─── 9. Seller Finder ──────────────

const keepaSellerFinder: ToolDefinition = {
  name: 'aibot_keepa_seller_finder',
  description: 'Filter Amazon sellers by criteria: country, rating, product count, FBA usage, location. Find competitors or suppliers.',
  group: 'keepa',
  inputSchema: z.object({
    domain: DomainSchema,
    country: z.string().optional().describe('Country code (CN, US, DE, etc.)'),
    minProductCount: z.number().optional(),
    maxProductCount: z.number().optional(),
    minRating: z.number().optional().describe('Min positive rating % (0-100)'),
    isFBA: z.boolean().optional(),
    sellerName: z.string().optional().describe('Seller name keyword'),
    page: z.number().int().optional().default(0),
    perPage: z.number().int().optional().default(50),
  }),
  handler: async (params, client) => {
    const result = await callKeepa('sellerquery', params, client);
    return JSON.stringify(result, null, 2);
  },
};

// ─── 10. Top Sellers ──────────────

const keepaTopSellers: ToolDefinition = {
  name: 'aibot_keepa_top_sellers',
  description: 'Get Amazon top sellers ranking. Returns up to 100,000 sellers.',
  group: 'keepa',
  inputSchema: z.object({
    domain: DomainSchema,
    category: z.number().optional().describe('Filter by category'),
    page: z.number().int().optional().default(0),
  }),
  handler: async (params, client) => {
    const result = await callKeepa('topseller', params, client);
    return JSON.stringify(result, null, 2);
  },
};

// ─── 11. Price Tracking ──────────────

const keepaTracking: ToolDefinition = {
  name: 'aibot_keepa_tracking',
  description: 'Manage Amazon price alerts. Create/get/update/remove price tracking for specific ASINs. Free (0 tokens).',
  group: 'keepa',
  inputSchema: z.object({
    action: z.enum(['create', 'get', 'update', 'remove', 'list']).default('list'),
    asin: z.string().optional().describe('ASIN (required for create/update/remove/get)'),
    domain: DomainSchema,
    desirePrice: z.number().optional().describe('Target price in cents (e.g. 2999 = $29.99)'),
    webhook: z.string().optional().describe('Webhook URL for notification'),
    email: z.string().optional().describe('Email for notification'),
  }),
  handler: async (params, client) => {
    const result = await callKeepa('tracking', params, client);
    return JSON.stringify(result, null, 2);
  },
};

// ─── 12. Price History Chart ──────────────

const keepaGraphImage: ToolDefinition = {
  name: 'aibot_keepa_graph_image',
  description: 'Generate a price history chart as PNG image for an Amazon product. 1 token per chart.',
  group: 'keepa',
  inputSchema: z.object({
    asin: z.string().describe('Product ASIN'),
    domain: DomainSchema,
    range: z.number().optional().default(90).describe('Time range in days'),
    width: z.number().optional().default(800),
    height: z.number().optional().default(300),
    types: z.string().optional().describe('Price types (csv indices): 0=Amazon, 1=New, 2=Used, 18=BuyBox'),
  }),
  handler: async (params, client) => {
    const result = await callKeepa('graphimage', params, client);
    return JSON.stringify(result, null, 2);
  },
};

// ─── Group ──────────────────────────────────────────

export const keepaGroup: ToolGroupModule = {
  group: 'keepa',
  label: 'Amazon Market Research (Keepa)',
  register() {
    return [
      keepaProduct, keepaProductFinder, keepaBestsellers,
      keepaCategory, keepaCategorySearch, keepaSearch,
      keepaDeals, keepaLightning, keepaSeller,
      keepaSellerFinder, keepaTopSellers, keepaTracking, keepaGraphImage,
    ];
  },
};
