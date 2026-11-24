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
// ─── 店铺列表 ──────────────────────────────────────────
const shopList = {
    name: 'aibot_tiktok_shop_list',
    description: 'List TikTok Shop stores authorized by the account that owns the CURRENT API key. ' +
        'Call this FIRST before any listing work. If the list is empty, call aibot_tiktok_shop_authorize ' +
        'to get an authorization URL the user opens in a browser.',
    group: 'tiktok-shop',
    inputSchema: z.object({}),
    handler: async (_params, client) => {
        const result = await client.get('/api/v1/tiktok-shop/shops');
        return JSON.stringify(result, null, 2);
    },
};
// ─── 授权链接 ──────────────────────────────────────────
const shopAuthorize = {
    name: 'aibot_tiktok_shop_authorize',
    description: 'Get a TikTok Shop OAuth authorization URL. The user must open this URL in a browser, log in with the shop owner account, ' +
        'and approve. After approving, the shop is bound to the current account automatically — then call aibot_tiktok_shop_list to confirm. ' +
        'This tool only returns a URL; it does not open a browser by itself.',
    group: 'tiktok-shop',
    inputSchema: z.object({}),
    handler: async (_params, client) => {
        const result = await client.post('/api/v1/tiktok-shop/authorize');
        return JSON.stringify(result, null, 2);
    },
};
// ─── 解除授权 ──────────────────────────────────────────
const shopUnbind = {
    name: 'aibot_tiktok_shop_unbind',
    description: 'Revoke the authorization of one shop (soft delete on our side — the shop is unbound from the current account, ' +
        'nothing is deleted inside TikTok itself). Only call after the user explicitly asks to disconnect a shop. ' +
        'Pass the `id` field returned by aibot_tiktok_shop_list.',
    group: 'tiktok-shop',
    inputSchema: z.object({
        auth_id: z
            .union([z.number().int(), z.string()])
            .describe('The `id` value returned by aibot_tiktok_shop_list (shop record ID, not shop_id)'),
    }),
    handler: async (params, client) => {
        const id = String(params.auth_id ?? '').trim();
        if (!/^\d+$/.test(id)) {
            return JSON.stringify({
                success: false,
                error: 'auth_id 无效',
                message: '请传 aibot_tiktok_shop_list 返回的 id（数字记录 ID），不是 shop_id。',
            }, null, 2);
        }
        const result = await client.delete(`/api/v1/tiktok-shop/shops/${id}`);
        return JSON.stringify(result, null, 2);
    },
};
// ─── 可售类目 ──────────────────────────────────────────
const shopCategories = {
    name: 'aibot_tiktok_shop_categories',
    description: 'List leaf categories the authorized shop is allowed to sell in. ' +
        'ALWAYS use this (instead of guessing) to obtain a category_id before publishing. ' +
        'Pass category_id to aibot_tiktok_shop_publish.',
    group: 'tiktok-shop',
    inputSchema: z.object({
        keyword: z
            .string()
            .optional()
            .describe('Filter by keyword. IMPORTANT: categories are named in the shop marketplace language ' +
            '(e.g. Spanish for MX, English for US), and matching is accent-sensitive — "audifonos" will NOT match ' +
            '"audífonos". When unsure, omit keyword and page through with limit instead.'),
        shop_id: z
            .string()
            .optional()
            .describe('Shop ID belonging to the CURRENT API key\'s account. Pass one from aibot_tiktok_shop_list only; ' +
            'omit to use the most recently authorized shop of this account. A shop ID from any other account is rejected.'),
        locale: z.string().optional().describe('Category locale, e.g. en-US, es-MX; defaults to the shop marketplace'),
        limit: z.number().int().min(1).max(500).optional().default(200).describe('Max categories to return'),
    }),
    handler: async (params, client) => {
        const query = {};
        if (params.keyword)
            query.keyword = String(params.keyword);
        if (params.shop_id)
            query.shop_id = String(params.shop_id);
        if (params.locale)
            query.locale = String(params.locale);
        if (params.limit)
            query.limit = String(params.limit);
        const result = await client.get('/api/v1/tiktok-shop/categories', query);
        return JSON.stringify(result, null, 2);
    },
};
// ─── 类目属性 ──────────────────────────────────────────
const shopCategoryAttributes = {
    name: 'aibot_tiktok_shop_category_attributes',
    description: 'Get the attribute schema of a category, including which fields are REQUIRED. ' +
        'Call this after picking a category_id and before publishing; map required_attributes into ' +
        'product_attributes of aibot_tiktok_shop_publish. Some categories are strict — publishing without ' +
        'required attributes will fail.',
    group: 'tiktok-shop',
    inputSchema: z.object({
        category_id: z.string().describe('Leaf category ID from aibot_tiktok_shop_categories'),
        shop_id: z.string().optional(),
        locale: z.string().optional(),
    }),
    handler: async (params, client) => {
        const query = {};
        if (params.shop_id)
            query.shop_id = String(params.shop_id);
        if (params.locale)
            query.locale = String(params.locale);
        const result = await client.get(`/api/v1/tiktok-shop/categories/${encodeURIComponent(String(params.category_id))}/attributes`, query);
        return JSON.stringify(result, null, 2);
    },
};
// ─── 仓库 ──────────────────────────────────────────────
const shopWarehouses = {
    name: 'aibot_tiktok_shop_warehouses',
    description: 'List the warehouses of the authorized shop. Publishing is blocked if the shop has no warehouse; ' +
        'use this to diagnose "no warehouse" errors before publishing.',
    group: 'tiktok-shop',
    inputSchema: z.object({
        shop_id: z.string().optional(),
    }),
    handler: async (params, client) => {
        const query = {};
        if (params.shop_id)
            query.shop_id = String(params.shop_id);
        const result = await client.get('/api/v1/tiktok-shop/warehouses', query);
        return JSON.stringify(result, null, 2);
    },
};
// ─── 上架（会真实创建并激活商品） ──────────────────────
const shopPublish = {
    name: 'aibot_tiktok_shop_publish',
    description: 'Publish a REAL product to the authorized shop — it goes into TikTok review, not a saved draft. ' +
        'Requires explicit user consent and a category_id resolved via aibot_tiktok_shop_categories. ' +
        'Images must be public HTTP(S) URLs. On failure the server keeps a checkpoint: resubmit identical ' +
        'params to resume without re-uploading or duplicating drafts.',
    group: 'tiktok-shop',
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
            .array(z.object({
            name: z.string().describe('Axis name, e.g. "Color"'),
            values: z.array(z.string()).describe('Axis values, e.g. ["Black","White"]'),
        }))
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
            .array(z.object({
            seller_sku: z.string().optional(),
            price_amount: z.string(),
            price_currency: z.string().optional(),
            inventory_quantity: z.number().int().optional(),
            sales_attributes: z
                .array(z.object({ name: z.string(), value: z.string(), image_url: z.string().optional() }))
                .optional(),
        }))
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
        shop_id: z
            .string()
            .optional()
            .describe('Target shop belonging to the CURRENT API key\'s account; omit to use the most recently authorized shop of this account'),
    }),
    handler: async (params, client, _config) => {
        if (params.confirm_publish !== true) {
            return JSON.stringify({
                success: false,
                error: 'confirm_publish 必须显式为 true',
                message: '这是真实上架操作（创建并激活商品，进入 TikTok 审核），不是存草稿。请先向用户确认要上架的商品信息，得到明确同意后，把 confirm_publish 设为 true 再调用。',
            }, null, 2);
        }
        const { confirm_publish: _confirm, ...payload } = params;
        // 图片字段二选一，避免同时传导致歧义
        if (payload.image_urls && !payload.main_images) {
            // 保留 image_urls，服务端会拆分为主图/详情图
        }
        else {
            delete payload.image_urls;
        }
        if (!payload.category_id && !payload.category_keyword) {
            return JSON.stringify({
                success: false,
                error: '缺少类目',
                message: '请先调用 aibot_tiktok_shop_categories 拿到 category_id，再上架。',
            }, null, 2);
        }
        if (!payload.variant_axes?.length && !payload.skus?.length) {
            return JSON.stringify({
                success: false,
                error: '缺少销售规格',
                message: '请提供 variant_axes（+ sku_defaults）或 skus，至少一种。',
            }, null, 2);
        }
        const result = await client.post('/api/v1/tiktok-shop/listings/submit', payload);
        return JSON.stringify(result, null, 2);
    },
};
// ═══ 商品管理 ═════════════════════════════════════════
const productSearch = {
    name: 'aibot_tiktok_shop_product_search',
    description: 'List the products of the authorized shop, paginated. Use this to find product_id / sku_id before price or stock updates. ' +
        'Filters are passed to TikTok verbatim via filters_json (e.g. {"status":"ACTIVE"}).',
    group: 'tiktok-shop',
    inputSchema: z.object({
        page_size: z.number().int().min(1).max(100).optional().default(20),
        page_token: z.string().optional().describe('Cursor from the previous response (next_page_token)'),
        filters_json: z.string().optional().describe('Raw TikTok filter object as JSON, e.g. {"status":"ACTIVE"}'),
        shop_id: z.string().optional(),
    }),
    handler: async (params, client) => {
        const body = { page_size: params.page_size };
        if (params.page_token)
            body.page_token = params.page_token;
        if (params.filters_json) {
            try {
                body.filters = JSON.parse(String(params.filters_json));
            }
            catch {
                return JSON.stringify({ success: false, error: 'filters_json 不是合法 JSON' }, null, 2);
            }
        }
        if (params.shop_id)
            body.shop_id = params.shop_id;
        const result = await client.post('/api/v1/tiktok-shop/products/search', body);
        return JSON.stringify(result, null, 2);
    },
};
const productGet = {
    name: 'aibot_tiktok_shop_product_get',
    description: 'Get one product by product_id, including SKUs (sku id, price, inventory, sales attributes). ' +
        'Call this before updating price/stock to obtain the sku ids.',
    group: 'tiktok-shop',
    inputSchema: z.object({
        product_id: z.string().describe('Product ID'),
        shop_id: z.string().optional(),
    }),
    handler: async (params, client) => {
        const q = {};
        if (params.shop_id)
            q.shop_id = String(params.shop_id);
        const result = await client.get(`/api/v1/tiktok-shop/products/${encodeURIComponent(String(params.product_id))}`, q);
        return JSON.stringify(result, null, 2);
    },
};
const productUpdatePrice = {
    name: 'aibot_tiktok_shop_product_update_price',
    description: 'Update SKU prices of a product. Prices are per SKU — get sku ids from aibot_tiktok_shop_product_get first. ' +
        'Currency defaults to the shop marketplace currency.',
    group: 'tiktok-shop',
    inputSchema: z.object({
        product_id: z.string(),
        skus: z
            .array(z.object({
            id: z.string().describe('SKU id'),
            price_amount: z.string().describe('New price as string, e.g. "29.99"'),
            price_currency: z.string().optional(),
        }))
            .describe('SKUs to update'),
        shop_id: z.string().optional(),
    }),
    handler: async (params, client) => {
        const body = { skus: params.skus };
        if (params.shop_id)
            body.shop_id = params.shop_id;
        const result = await client.post(`/api/v1/tiktok-shop/products/${encodeURIComponent(String(params.product_id))}/prices`, body);
        return JSON.stringify(result, null, 2);
    },
};
const productUpdateStock = {
    name: 'aibot_tiktok_shop_product_update_stock',
    description: 'Update SKU inventory of a product. Each entry needs the sku id, the warehouse_id and the quantity. ' +
        'Use aibot_tiktok_shop_warehouses when you do not know the warehouse id.',
    group: 'tiktok-shop',
    inputSchema: z.object({
        product_id: z.string(),
        skus: z
            .array(z.object({
            id: z.string().describe('SKU id'),
            warehouse_id: z.string(),
            quantity: z.number().int().min(0),
        }))
            .describe('SKU inventory entries'),
        shop_id: z.string().optional(),
    }),
    handler: async (params, client) => {
        const body = { skus: params.skus };
        if (params.shop_id)
            body.shop_id = params.shop_id;
        const result = await client.post(`/api/v1/tiktok-shop/products/${encodeURIComponent(String(params.product_id))}/inventory`, body);
        return JSON.stringify(result, null, 2);
    },
};
const inventoryCheck = {
    name: 'aibot_tiktok_shop_inventory_check',
    description: 'Query current inventory for up to 50 products at once.',
    group: 'tiktok-shop',
    inputSchema: z.object({
        product_ids: z.array(z.string()).describe('Product IDs (max 50)'),
        shop_id: z.string().optional(),
    }),
    handler: async (params, client) => {
        const body = { product_ids: params.product_ids };
        if (params.shop_id)
            body.shop_id = params.shop_id;
        const result = await client.post('/api/v1/tiktok-shop/inventory/search', body);
        return JSON.stringify(result, null, 2);
    },
};
const productActivate = {
    name: 'aibot_tiktok_shop_product_activate',
    description: 'Activate (put on sale) up to 20 products. Use after a draft product is created and reviewed.',
    group: 'tiktok-shop',
    inputSchema: z.object({
        product_ids: z.array(z.string()).describe('Product IDs (max 20)'),
        shop_id: z.string().optional(),
    }),
    handler: async (params, client) => {
        const body = { product_ids: params.product_ids };
        if (params.shop_id)
            body.shop_id = params.shop_id;
        const result = await client.post('/api/v1/tiktok-shop/products/activate', body);
        return JSON.stringify(result, null, 2);
    },
};
const productDeactivate = {
    name: 'aibot_tiktok_shop_product_deactivate',
    description: 'Deactivate (take off sale) up to 20 products. Reversible — the product stays in the shop as inactive.',
    group: 'tiktok-shop',
    inputSchema: z.object({
        product_ids: z.array(z.string()).describe('Product IDs (max 20)'),
        shop_id: z.string().optional(),
    }),
    handler: async (params, client) => {
        const body = { product_ids: params.product_ids };
        if (params.shop_id)
            body.shop_id = params.shop_id;
        const result = await client.post('/api/v1/tiktok-shop/products/deactivate', body);
        return JSON.stringify(result, null, 2);
    },
};
const productDelete = {
    name: 'aibot_tiktok_shop_product_delete',
    description: 'PERMANENTLY delete up to 20 products from the shop. This cannot be undone. ' +
        'Only call after the user explicitly confirms which products to delete; prefer aibot_tiktok_shop_product_deactivate when unsure.',
    group: 'tiktok-shop',
    inputSchema: z.object({
        confirm_delete: z.boolean().describe('Must be true; set only after the user explicitly agreed to delete'),
        product_ids: z.array(z.string()).describe('Product IDs to delete (max 20)'),
        shop_id: z.string().optional(),
    }),
    handler: async (params, client) => {
        if (params.confirm_delete !== true) {
            return JSON.stringify({
                success: false,
                error: 'confirm_delete 必须显式为 true',
                message: '删除不可恢复。请先向用户确认要删除的商品，得到明确同意后把 confirm_delete 设为 true；若只是想停售，用下架工具。',
            }, null, 2);
        }
        const body = { product_ids: params.product_ids };
        if (params.shop_id)
            body.shop_id = params.shop_id;
        const result = await client.delete('/api/v1/tiktok-shop/products', body);
        return JSON.stringify(result, null, 2);
    },
};
// ═══ 订单 ═════════════════════════════════════════════
const orderSearch = {
    name: 'aibot_tiktok_shop_orders',
    description: 'List orders of the authorized shop, paginated. Filters go to TikTok verbatim via filters_json ' +
        '(e.g. {"order_status":"AWAITING_SHIPMENT"} or {"create_time_ge":1730000000}).',
    group: 'tiktok-shop',
    inputSchema: z.object({
        page_size: z.number().int().min(1).max(100).optional().default(20),
        page_token: z.string().optional(),
        filters_json: z.string().optional().describe('Raw TikTok filter object as JSON'),
        shop_id: z.string().optional(),
    }),
    handler: async (params, client) => {
        const body = { page_size: params.page_size };
        if (params.page_token)
            body.page_token = params.page_token;
        if (params.filters_json) {
            try {
                body.filters = JSON.parse(String(params.filters_json));
            }
            catch {
                return JSON.stringify({ success: false, error: 'filters_json 不是合法 JSON' }, null, 2);
            }
        }
        if (params.shop_id)
            body.shop_id = params.shop_id;
        const result = await client.post('/api/v1/tiktok-shop/orders/search', body);
        return JSON.stringify(result, null, 2);
    },
};
const orderGet = {
    name: 'aibot_tiktok_shop_order_get',
    description: 'Get full details of up to 50 orders by order id (line items, amounts, shipping, status). ' +
        'Get order ids from aibot_tiktok_shop_orders.',
    group: 'tiktok-shop',
    inputSchema: z.object({
        order_ids: z.array(z.string()).describe('Order ids (max 50)'),
        shop_id: z.string().optional(),
    }),
    handler: async (params, client) => {
        const q = { ids: params.order_ids.join(',') };
        if (params.shop_id)
            q.shop_id = String(params.shop_id);
        const result = await client.get('/api/v1/tiktok-shop/orders', q);
        return JSON.stringify(result, null, 2);
    },
};
// ═══ 履约 / 发货 ══════════════════════════════════════
const packageSearch = {
    name: 'aibot_tiktok_shop_packages',
    description: 'List fulfilment packages, paginated. A package is what you actually ship; ' +
        'use it to find package_id before calling aibot_tiktok_shop_package_ship.',
    group: 'tiktok-shop',
    inputSchema: z.object({
        page_size: z.number().int().min(1).max(100).optional().default(20),
        page_token: z.string().optional(),
        filters_json: z.string().optional().describe('Raw TikTok filter object as JSON'),
        shop_id: z.string().optional(),
    }),
    handler: async (params, client) => {
        const body = { page_size: params.page_size };
        if (params.page_token)
            body.page_token = params.page_token;
        if (params.filters_json) {
            try {
                body.filters = JSON.parse(String(params.filters_json));
            }
            catch {
                return JSON.stringify({ success: false, error: 'filters_json 不是合法 JSON' }, null, 2);
            }
        }
        if (params.shop_id)
            body.shop_id = params.shop_id;
        const result = await client.post('/api/v1/tiktok-shop/packages/search', body);
        return JSON.stringify(result, null, 2);
    },
};
const packageGet = {
    name: 'aibot_tiktok_shop_package_get',
    description: 'Get one package by package_id, including order ids, items and shipping status.',
    group: 'tiktok-shop',
    inputSchema: z.object({
        package_id: z.string(),
        shop_id: z.string().optional(),
    }),
    handler: async (params, client) => {
        const q = {};
        if (params.shop_id)
            q.shop_id = String(params.shop_id);
        const result = await client.get(`/api/v1/tiktok-shop/packages/${encodeURIComponent(String(params.package_id))}`, q);
        return JSON.stringify(result, null, 2);
    },
};
const packageShip = {
    name: 'aibot_tiktok_shop_package_ship',
    description: 'Ship a package with a self-arranged carrier. THIS IS A REAL SHIPMENT: the buyer sees the tracking number and the order moves to shipped. ' +
        'Requires shipping_provider_id (see it in Seller Center / package detail) and tracking_number. ' +
        'Only call after the user confirms the carrier and tracking number.',
    group: 'tiktok-shop',
    inputSchema: z.object({
        confirm_ship: z.boolean().describe('Must be true; set only after the user confirmed the shipment'),
        package_id: z.string(),
        shipping_provider_id: z.string().describe('Carrier id from TikTok (Seller Center → shipping settings)'),
        tracking_number: z.string(),
        shipping_provider_name: z.string().optional(),
        shop_id: z.string().optional(),
    }),
    handler: async (params, client) => {
        if (params.confirm_ship !== true) {
            return JSON.stringify({
                success: false,
                error: 'confirm_ship 必须显式为 true',
                message: '这是真实发货：买家会看到运单号，订单状态变为已发货且不可撤回。请先与用户确认承运商与运单号。',
            }, null, 2);
        }
        const body = {
            shipping_provider_id: params.shipping_provider_id,
            tracking_number: params.tracking_number,
        };
        if (params.shipping_provider_name)
            body.shipping_provider_name = params.shipping_provider_name;
        if (params.shop_id)
            body.shop_id = params.shop_id;
        const result = await client.post(`/api/v1/tiktok-shop/packages/${encodeURIComponent(String(params.package_id))}/ship`, body);
        return JSON.stringify(result, null, 2);
    },
};
// ═══ 售后 / 退款 ══════════════════════════════════════
const returnSearch = {
    name: 'aibot_tiktok_shop_returns',
    description: 'List after-sales (return / refund) requests of the shop, paginated. ' +
        'Use it to find return_id, then call aibot_tiktok_shop_return_decide.',
    group: 'tiktok-shop',
    inputSchema: z.object({
        page_size: z.number().int().min(1).max(100).optional().default(20),
        page_token: z.string().optional(),
        return_ids: z.array(z.string()).optional().describe('Query specific return ids'),
        shop_id: z.string().optional(),
    }),
    handler: async (params, client) => {
        const body = { page_size: params.page_size };
        if (params.page_token)
            body.page_token = params.page_token;
        if (params.return_ids?.length)
            body.return_ids = params.return_ids;
        if (params.shop_id)
            body.shop_id = params.shop_id;
        const result = await client.post('/api/v1/tiktok-shop/returns/search', body);
        return JSON.stringify(result, null, 2);
    },
};
const returnDecide = {
    name: 'aibot_tiktok_shop_return_decide',
    description: 'Approve or reject an after-sales request. This affects the buyer directly, so only call after the user explicitly decides. ' +
        'REJECT requires a reject_reason.',
    group: 'tiktok-shop',
    inputSchema: z.object({
        confirm_decision: z.boolean().describe('Must be true; set only after the user explicitly made the decision'),
        return_id: z.string(),
        decision: z.enum(['APPROVE', 'REJECT']),
        reject_reason: z.string().optional().describe('Required when decision is REJECT'),
        shop_id: z.string().optional(),
    }),
    handler: async (params, client) => {
        if (params.confirm_decision !== true) {
            return JSON.stringify({
                success: false,
                error: 'confirm_decision 必须显式为 true',
                message: '同意/拒绝售后会直接影响买家。请先向用户确认处理意见，再把这位置为 true。',
            }, null, 2);
        }
        if (params.decision === 'REJECT' && !params.reject_reason) {
            return JSON.stringify({ success: false, error: '拒绝售后必须提供 reject_reason' }, null, 2);
        }
        const body = { decision: params.decision };
        if (params.reject_reason)
            body.reject_reason = params.reject_reason;
        if (params.shop_id)
            body.shop_id = params.shop_id;
        const result = await client.post(`/api/v1/tiktok-shop/returns/${encodeURIComponent(String(params.return_id))}/decision`, body);
        return JSON.stringify(result, null, 2);
    },
};
// ═══ 营销 / 店铺 ══════════════════════════════════════
const promotionSearch = {
    name: 'aibot_tiktok_shop_promotions',
    description: 'List promotion activities (campaigns, discounts) of the shop, paginated.',
    group: 'tiktok-shop',
    inputSchema: z.object({
        page_size: z.number().int().min(1).max(100).optional().default(20),
        page_token: z.string().optional(),
        filters_json: z.string().optional(),
        shop_id: z.string().optional(),
    }),
    handler: async (params, client) => {
        const body = { page_size: params.page_size };
        if (params.page_token)
            body.page_token = params.page_token;
        if (params.filters_json) {
            try {
                body.filters = JSON.parse(String(params.filters_json));
            }
            catch {
                return JSON.stringify({ success: false, error: 'filters_json 不是合法 JSON' }, null, 2);
            }
        }
        if (params.shop_id)
            body.shop_id = params.shop_id;
        const result = await client.post('/api/v1/tiktok-shop/promotions/search', body);
        return JSON.stringify(result, null, 2);
    },
};
const shopInfo = {
    name: 'aibot_tiktok_shop_info',
    description: 'Get seller/shop profile info (shop name, region, seller type) for the authorized shop.',
    group: 'tiktok-shop',
    inputSchema: z.object({
        shop_id: z.string().optional(),
    }),
    handler: async (params, client) => {
        const q = {};
        if (params.shop_id)
            q.shop_id = String(params.shop_id);
        const result = await client.get('/api/v1/tiktok-shop/shop/info', q);
        return JSON.stringify(result, null, 2);
    },
};
const shopAnalytics = {
    name: 'aibot_tiktok_shop_analytics',
    description: 'Shop performance for a date range (default: last 30 days): GMV split by channel (LIVE / VIDEO / PRODUCT_CARD), ' +
        'gross revenue (GMV_MAX / NON_GMV_MAX), orders, items sold, SKU orders, refunds, customers, and traffic ' +
        '(visitors, page views, conversation rate). Data lags ~2 days; `latest_available_date` is the newest complete day. ' +
        'Range is [start_date, end_date).',
    group: 'tiktok-shop',
    inputSchema: z.object({
        start_date: z.string().optional().describe('YYYY-MM-DD, inclusive. Default: 30 days ago'),
        end_date: z
            .string()
            .optional()
            .describe('YYYY-MM-DD, exclusive. Default: today. Must be later than start_date'),
        shop_id: z
            .string()
            .optional()
            .describe('Shop ID belonging to the CURRENT API key\'s account; omit to use the most recently authorized shop'),
    }),
    handler: async (params, client) => {
        const q = {};
        if (params.start_date)
            q.start_date_ge = String(params.start_date);
        if (params.end_date)
            q.end_date_lt = String(params.end_date);
        if (params.shop_id)
            q.shop_id = String(params.shop_id);
        const result = await client.get('/api/v1/tiktok-shop/analytics/shop', q);
        return JSON.stringify(result, null, 2);
    },
};
// ─── Group ──────────────────────────────────────────
export const tiktokShopTools = [
    // 店铺 & 授权
    shopList,
    shopAuthorize,
    shopUnbind,
    shopInfo,
    // 经营数据
    shopAnalytics,
    // 类目 / 仓库 / 图片
    shopCategories,
    shopCategoryAttributes,
    shopWarehouses,
    // 上架
    shopPublish,
    // 商品管理
    productSearch,
    productGet,
    productUpdatePrice,
    productUpdateStock,
    inventoryCheck,
    productActivate,
    productDeactivate,
    productDelete,
    // 订单
    orderSearch,
    orderGet,
    // 履约发货
    packageSearch,
    packageGet,
    packageShip,
    // 售后
    returnSearch,
    returnDecide,
    // 营销
    promotionSearch,
];
export const tiktokShopGroup = {
    group: 'tiktok-shop',
    label: 'TikTok Shop Seller Ops (own shop: auth, publish, orders, shipping, returns, analytics)',
    register() {
        return tiktokShopTools;
    },
};
//# sourceMappingURL=tiktokShop.js.map