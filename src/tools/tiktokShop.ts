/**
 * TikTok Shop 店铺授权与上架 tools
 *
 * 依赖服务端开放 API（aibotspace.com）：
 *   GET    /api/v1/tiktok-shop/shops
 *   POST   /api/v1/tiktok-shop/authorize
 *   GET    /api/v1/tiktok-shop/categories
 *   GET    /api/v1/tiktok-shop/categories/:categoryId/attributes
 *   GET    /api/v1/tiktok-shop/warehouses
 *   POST   /api/v1/tiktok-shop/listings/submit
 *
 * 与 tiktok.ts 的区别：那边是 FastMoss 市场数据（只读选品），
 * 这里是用户自己店铺的授权、类目查询与真实上架。
 */

import { z } from 'zod';
import type { ToolDefinition, ToolGroupModule } from './register.js';

// ─── 店铺列表 ──────────────────────────────────────────

const shopList: ToolDefinition = {
  name: 'aibot_tiktok_shop_list',
  description:
    'List TikTok Shop stores the current user has authorized. ' +
    'Call this FIRST before any listing work. If the list is empty, call aibot_tiktok_shop_authorize ' +
    'to get an authorization URL the user opens in a browser.',
  group: 'tiktok',
  inputSchema: z.object({}),
  handler: async (_params, client) => {
    const result = await client.get('/api/v1/tiktok-shop/shops');
    return JSON.stringify(result, null, 2);
  },
};

// ─── 授权链接 ──────────────────────────────────────────

const shopAuthorize: ToolDefinition = {
  name: 'aibot_tiktok_shop_authorize',
  description:
    'Get a TikTok Shop OAuth authorization URL. The user must open this URL in a browser, log in with the shop owner account, ' +
    'and approve. After approving, the shop is bound to the current account automatically — then call aibot_tiktok_shop_list to confirm. ' +
    'This tool only returns a URL; it does not open a browser by itself.',
  group: 'tiktok',
  inputSchema: z.object({}),
  handler: async (_params, client) => {
    const result = await client.post('/api/v1/tiktok-shop/authorize');
    return JSON.stringify(result, null, 2);
  },
};

// ─── 解除授权 ──────────────────────────────────────────

const shopUnbind: ToolDefinition = {
  name: 'aibot_tiktok_shop_unbind',
  description:
    'Revoke the authorization of one shop (soft delete on our side — the shop is unbound from the current account, ' +
    'nothing is deleted inside TikTok itself). Only call after the user explicitly asks to disconnect a shop. ' +
    'Pass the `id` field returned by aibot_tiktok_shop_list.',
  group: 'tiktok',
  inputSchema: z.object({
    auth_id: z
      .union([z.number().int(), z.string()])
      .describe('The `id` value returned by aibot_tiktok_shop_list (shop record ID, not shop_id)'),
  }),
  handler: async (params, client) => {
    const id = String((params as any).auth_id ?? '').trim();
    if (!/^\d+$/.test(id)) {
      return JSON.stringify(
        {
          success: false,
          error: 'auth_id 无效',
          message: '请传 aibot_tiktok_shop_list 返回的 id（数字记录 ID），不是 shop_id。',
        },
        null,
        2,
      );
    }
    const result = await client.delete(`/api/v1/tiktok-shop/shops/${id}`);
    return JSON.stringify(result, null, 2);
  },
};

// ─── 可售类目 ──────────────────────────────────────────

const shopCategories: ToolDefinition = {
  name: 'aibot_tiktok_shop_categories',
  description:
    'List leaf categories the authorized shop is allowed to sell in. ' +
    'ALWAYS use this (instead of guessing) to obtain a category_id before publishing. ' +
    'Pass category_id to aibot_tiktok_shop_publish.',
  group: 'tiktok',
  inputSchema: z.object({
    keyword: z
      .string()
      .optional()
      .describe(
        'Filter by keyword. IMPORTANT: categories are named in the shop marketplace language ' +
          '(e.g. Spanish for MX, English for US), and matching is accent-sensitive — "audifonos" will NOT match ' +
          '"audífonos". When unsure, omit keyword and page through with limit instead.',
      ),
    shop_id: z.string().optional().describe('Shop ID; omit to use the most recently authorized shop'),
    locale: z.string().optional().describe('Category locale, e.g. en-US, es-MX; defaults to the shop marketplace'),
    limit: z.number().int().min(1).max(500).optional().default(200).describe('Max categories to return'),
  }),
  handler: async (params, client) => {
    const query: Record<string, string> = {};
    if (params.keyword) query.keyword = String(params.keyword);
    if (params.shop_id) query.shop_id = String(params.shop_id);
    if (params.locale) query.locale = String(params.locale);
    if (params.limit) query.limit = String(params.limit);
    const result = await client.get('/api/v1/tiktok-shop/categories', query);
    return JSON.stringify(result, null, 2);
  },
};

// ─── 类目属性 ──────────────────────────────────────────

const shopCategoryAttributes: ToolDefinition = {
  name: 'aibot_tiktok_shop_category_attributes',
  description:
    'Get the attribute schema of a category, including which fields are REQUIRED. ' +
    'Call this after picking a category_id and before publishing; map required_attributes into ' +
    'product_attributes of aibot_tiktok_shop_publish. Some categories are strict — publishing without ' +
    'required attributes will fail.',
  group: 'tiktok',
  inputSchema: z.object({
    category_id: z.string().describe('Leaf category ID from aibot_tiktok_shop_categories'),
    shop_id: z.string().optional(),
    locale: z.string().optional(),
  }),
  handler: async (params, client) => {
    const query: Record<string, string> = {};
    if (params.shop_id) query.shop_id = String(params.shop_id);
    if (params.locale) query.locale = String(params.locale);
    const result = await client.get(
      `/api/v1/tiktok-shop/categories/${encodeURIComponent(String(params.category_id))}/attributes`,
      query,
    );
    return JSON.stringify(result, null, 2);
  },
};

// ─── 仓库 ──────────────────────────────────────────────

const shopWarehouses: ToolDefinition = {
  name: 'aibot_tiktok_shop_warehouses',
  description:
    'List the warehouses of the authorized shop. Publishing is blocked if the shop has no warehouse; ' +
    'use this to diagnose "no warehouse" errors before publishing.',
  group: 'tiktok',
  inputSchema: z.object({
    shop_id: z.string().optional(),
  }),
  handler: async (params, client) => {
    const query: Record<string, string> = {};
    if (params.shop_id) query.shop_id = String(params.shop_id);
    const result = await client.get('/api/v1/tiktok-shop/warehouses', query);
    return JSON.stringify(result, null, 2);
  },
};

// ─── 上架（会真实创建并激活商品） ──────────────────────

const shopPublish: ToolDefinition = {
  name: 'aibot_tiktok_shop_publish',
  description:
    'Publish a product to the authorized TikTok Shop. WARNING: this CREATES AND ACTIVATES a real product that goes into ' +
    'TikTok review — it is not a saved draft. Only call it after the user explicitly agrees to publish, and after you have ' +
    'resolved category_id via aibot_tiktok_shop_categories and checked required attributes. ' +
    'Images must be publicly reachable HTTP(S) URLs. ' +
    'If it fails, the server returns resume_hint and keeps a checkpoint: re-submit with IDENTICAL parameters to resume ' +
    'without re-uploading images or duplicating drafts.',
  group: 'tiktok',
  inputSchema: z.object({
    confirm_publish: z
      .boolean()
      .describe('Must be true. Set it only after the user has explicitly agreed to publish this product to their shop.'),
    title: z.string().describe('Product title (marketplace language, no Chinese unless the target market uses it)'),
    description: z.string().optional().describe('Product description (HTML allowed)'),
    category_id: z.string().optional().describe('Leaf category ID from aibot_tiktok_shop_categories (recommended)'),
    category_keyword: z.string().optional().describe('Fallback: category keyword, used only when category_id is absent'),
    main_images: z
      .array(z.string())
      .optional()
      .describe('Main image URLs (1-3 recommended, first one is the cover). Public HTTP(S) only.'),
    description_images: z.array(z.string()).optional().describe('Detail/description image URLs'),
    image_urls: z
      .array(z.string())
      .optional()
      .describe('Deprecated fallback: first 3 become main images, the rest become detail images. Prefer main_images.'),
    variant_axes: z
      .array(
        z.object({
          name: z.string().describe('Axis name, e.g. "Color"'),
          values: z.array(z.string()).describe('Axis values, e.g. ["Black","White"]'),
        }),
      )
      .optional()
      .describe('Sales variant axes; the server expands the cartesian product into SKUs automatically'),
    sku_defaults: z
      .object({
        price_amount: z.string().describe('Price as string, e.g. "29.99"'),
        price_currency: z.string().optional().describe('Defaults to the marketplace currency'),
        inventory_quantity: z.number().int().optional().default(100),
        seller_sku_prefix: z.string().optional(),
      })
      .optional()
      .describe('Required when using variant_axes: default price/stock for every generated SKU'),
    skus: z
      .array(
        z.object({
          seller_sku: z.string().optional(),
          price_amount: z.string(),
          price_currency: z.string().optional(),
          inventory_quantity: z.number().int().optional(),
          sales_attributes: z
            .array(z.object({ name: z.string(), value: z.string(), image_url: z.string().optional() }))
            .optional(),
        }),
      )
      .optional()
      .describe('Explicit SKU list. Use this OR variant_axes, not both.'),
    product_attributes: z
      .array(z.object({ name: z.string(), value: z.string() }))
      .optional()
      .describe('Product-level attributes, e.g. Brand / Material. Fill required ones from category attributes.'),
    package_weight: z
      .object({ value: z.string(), unit: z.string().optional() })
      .optional()
      .describe('Package weight, e.g. { value: "0.3", unit: "KILOGRAM" }'),
    package_dimensions: z
      .object({
        length: z.string(),
        width: z.string(),
        height: z.string(),
        unit: z.string().optional(),
      })
      .optional()
      .describe('Package dimensions, e.g. { length:"20", width:"15", height:"5", unit:"CENTIMETER" }'),
    brand_id: z.string().optional(),
    marketplace: z
      .string()
      .optional()
      .describe('Marketplace code (US/MX/GB/...); defaults to the shop marketplace'),
    shop_id: z.string().optional().describe('Target shop; omit to use the most recently authorized shop'),
  }),
  handler: async (params, client, _config) => {
    if (params.confirm_publish !== true) {
      return JSON.stringify(
        {
          success: false,
          error: 'confirm_publish 必须显式为 true',
          message:
            '这是真实上架操作（创建并激活商品，进入 TikTok 审核），不是存草稿。请先向用户确认要上架的商品信息，得到明确同意后，把 confirm_publish 设为 true 再调用。',
        },
        null,
        2,
      );
    }

    const { confirm_publish: _confirm, ...payload } = params;

    // 图片字段二选一，避免同时传导致歧义
    if (payload.image_urls && !payload.main_images) {
      // 保留 image_urls，服务端会拆分为主图/详情图
    } else {
      delete payload.image_urls;
    }

    if (!payload.category_id && !payload.category_keyword) {
      return JSON.stringify(
        {
          success: false,
          error: '缺少类目',
          message: '请先调用 aibot_tiktok_shop_categories 拿到 category_id，再上架。',
        },
        null,
        2,
      );
    }
    if (!payload.variant_axes?.length && !payload.skus?.length) {
      return JSON.stringify(
        {
          success: false,
          error: '缺少销售规格',
          message: '请提供 variant_axes（+ sku_defaults）或 skus，至少一种。',
        },
        null,
        2,
      );
    }

    const result = await client.post('/api/v1/tiktok-shop/listings/submit', payload);
    return JSON.stringify(result, null, 2);
  },
};

// ─── Group ──────────────────────────────────────────

export const tiktokShopTools: ToolDefinition[] = [
  shopList,
  shopAuthorize,
  shopUnbind,
  shopCategories,
  shopCategoryAttributes,
  shopWarehouses,
  shopPublish,
];

export const tiktokShopGroup: ToolGroupModule = {
  group: 'tiktok',
  label: 'TikTok Shop Listing (OAuth + Publish)',
  register() {
    return tiktokShopTools;
  },
};
