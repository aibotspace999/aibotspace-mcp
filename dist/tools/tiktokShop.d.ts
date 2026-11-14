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
import type { ToolDefinition, ToolGroupModule } from './register.js';
export declare const tiktokShopTools: ToolDefinition[];
export declare const tiktokShopGroup: ToolGroupModule;
//# sourceMappingURL=tiktokShop.d.ts.map