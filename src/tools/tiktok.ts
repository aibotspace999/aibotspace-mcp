/**
 * TikTok tools - FastMoss analytics API
 *
 * Routes on aibotspace.com (Open API v1):
 *   POST /api/v1/tiktok/product/search
 *   POST /api/v1/tiktok/product/rank/new-listed
 *   POST /api/v1/tiktok/product/rank/top-selling
 *   POST /api/v1/tiktok/product/video-list
 *   POST /api/v1/tiktok/product/reviews
 *   POST /api/v1/tiktok/shop/search
 *   POST /api/v1/tiktok/shop/product-list
 *   GET  /api/v1/tiktok/category/list
 *   POST /api/v1/tiktok/hot-videos
 */

import { z } from 'zod';
import type { ToolDefinition, ToolGroupModule } from './register.js';
import type { AibotSpaceClient } from '../client.js';
import { tiktokShopTools } from './tiktokShop.js';

// ─── TikTok Product Search ──────────────────────────────

const tiktokProductSearch: ToolDefinition = {
  name: 'aibot_tiktok_product_search',
  description: 'Search TikTok Shop products by keyword. Returns: product title, price, sales volume, rating, shop name, product images, and affiliate commission rate. Useful for finding trending products and analyzing competition.',
  group: 'tiktok',
  inputSchema: z.object({
    keyword: z.string().describe('Search keyword (e.g., "smart ring", "yoga mat")'),
    region: z.string().optional().default('US').describe('Region: US, UK, ID, MY, TH, VN, PH, SG'),
    page: z.number().int().optional().default(1),
    pageSize: z.number().int().optional().default(20).describe('Results per page (max 100)'),
    min_price: z.number().optional().describe('Minimum price filter'),
    max_price: z.number().optional().describe('Maximum price filter'),
    min_sales: z.number().optional().describe('Minimum sales volume filter'),
  }),
  handler: async (params, client) => {
    const result = await client.post('/api/v1/tiktok/product/search', params);
    return JSON.stringify(result, null, 2);
  },
};

// ─── TikTok Hot Videos ──────────────────────────────

const tiktokHotVideos: ToolDefinition = {
  name: 'aibot_tiktok_hot_videos',
  description: 'Find trending/viral TikTok videos by keyword. Returns: video URL, view count, like count, comment count, share count, creator info, and associated product links. Perfect for content research and influencer discovery.',
  group: 'tiktok',
  inputSchema: z.object({
    keyword: z.string().optional().describe('Search keyword or hashtag'),
    region: z.string().optional().default('US'),
    page: z.number().int().optional().default(1),
    pageSize: z.number().int().optional().default(20),
    previewDaily: z.boolean().optional().describe('Preview mode: only first page'),
  }),
  handler: async (params, client) => {
    const result = await client.post('/api/v1/tiktok/hot-videos', params);
    return JSON.stringify(result, null, 2);
  },
};

// ─── TikTok New Listed Products ──────────────────────────────

const tiktokNewListed: ToolDefinition = {
  name: 'aibot_tiktok_new_listed',
  description: 'Get newly listed TikTok Shop products (launched in recent days). Returns: product details, launch date, initial sales, price. Ideal for spotting emerging trends before they become saturated.',
  group: 'tiktok',
  inputSchema: z.object({
    region: z.string().optional().default('US'),
    categoryId: z.string().optional().describe('Category ID filter'),
    page: z.number().int().optional().default(1),
    pageSize: z.number().int().optional().default(20),
  }),
  handler: async (params, client) => {
    const result = await client.post('/api/v1/tiktok/product/rank/new-listed', params);
    return JSON.stringify(result, null, 2);
  },
};

// ─── TikTok Top Selling ──────────────────────────────

const tiktokTopSelling: ToolDefinition = {
  name: 'aibot_tiktok_top_selling',
  description: 'Get top-selling TikTok Shop products ranked by sales volume.',
  group: 'tiktok',
  inputSchema: z.object({
    region: z.string().optional().default('US'),
    categoryId: z.string().optional(),
    page: z.number().int().optional().default(1),
    pageSize: z.number().int().optional().default(20),
  }),
  handler: async (params, client) => {
    const result = await client.post('/api/v1/tiktok/product/rank/top-selling', params);
    return JSON.stringify(result, null, 2);
  },
};

// ─── TikTok Categories ──────────────────────────────

const tiktokCategories: ToolDefinition = {
  name: 'aibot_tiktok_categories',
  description: 'List all TikTok Shop product categories with IDs and hierarchy. Public endpoint, no auth required.',
  group: 'tiktok',
  inputSchema: z.object({
    region: z.string().optional().default('US'),
  }),
  handler: async (params, client) => {
    const result = await client.get('/api/v1/tiktok/category/list', { region: params.region || 'US' });
    return JSON.stringify(result, null, 2);
  },
};

// ─── TikTok Shop Search ──────────────────────────────

const tiktokShopSearch: ToolDefinition = {
  name: 'aibot_tiktok_shop_search',
  description: 'Search TikTok Shop sellers/shops by name or keyword. Read-only market data from FastMoss — ' +
    'this is NOT your own store. For shops you have authorized, use aibot_tiktok_shop_list.',
  group: 'tiktok',
  inputSchema: z.object({
    keyword: z.string().describe('Shop name or keyword'),
    region: z.string().optional().default('US'),
    page: z.number().int().optional().default(1),
    pageSize: z.number().int().optional().default(20),
  }),
  handler: async (params, client) => {
    const result = await client.post('/api/v1/tiktok/shop/search', params);
    return JSON.stringify(result, null, 2);
  },
};

// ─── TikTok Shop Products ──────────────────────────────

const tiktokShopProducts: ToolDefinition = {
  name: 'aibot_tiktok_shop_products',
  description: 'List products of a specific TikTok Shop (any shop, read-only market data from FastMoss). ' +
    'For products in YOUR authorized shop, use aibot_tiktok_shop_product_search instead.',
  group: 'tiktok',
  inputSchema: z.object({
    shopId: z.string().describe('TikTok Shop ID'),
    region: z.string().optional().default('US'),
    page: z.number().int().optional().default(1),
    pageSize: z.number().int().optional().default(20),
  }),
  handler: async (params, client) => {
    const result = await client.post('/api/v1/tiktok/shop/product-list', params);
    return JSON.stringify(result, null, 2);
  },
};

// ─── TikTok Product Videos ──────────────────────────────

const tiktokProductVideos: ToolDefinition = {
  name: 'aibot_tiktok_product_videos',
  description: 'Get videos associated with a specific TikTok Shop product.',
  group: 'tiktok',
  inputSchema: z.object({
    productId: z.string().describe('TikTok product ID'),
    region: z.string().optional().default('US'),
    page: z.number().int().optional().default(1),
    pageSize: z.number().int().optional().default(20),
  }),
  handler: async (params, client) => {
    const result = await client.post('/api/v1/tiktok/product/video-list', params);
    return JSON.stringify(result, null, 2);
  },
};

// ─── Group ──────────────────────────────────────────

export const tiktokGroup: ToolGroupModule = {
  group: 'tiktok',
  label: 'TikTok Shop (Market Analytics + Store Listing)',
  register() {
    return [
      tiktokProductSearch, tiktokHotVideos, tiktokNewListed, tiktokTopSelling,
      tiktokCategories, tiktokShopSearch, tiktokShopProducts, tiktokProductVideos,
      // 店铺授权 + 上架（同一个 group，已在用 tiktok 的用户无需改配置）
      ...tiktokShopTools,
    ];
  },
};
