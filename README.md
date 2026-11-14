# AIBotSpace MCP Server

AIBotSpace 统一 MCP 服务器 — 在 Claude Code / Codex / Cursor 等 AI 工具中直接调用 AIBotSpace 的全部能力。

## 功能

| 组 | 工具数 | 说明 |
|---|---|---|
| 🎨 AI 创作 | 5 | GPT Image 2 / NANO2 / NANO PRO 生图；Seedance / MiniMax H3 / Muse / Omni / Sora / Veo 生视频 |
| 🎵 TikTok 选品 | 8 | FastMoss：商品搜索、热门视频、新品榜、销量榜、店铺搜索 |
| 📊 Amazon 分析 | 13 | Keepa：商品详情、蓝海选品、畅销榜、促销、卖家筛选、价格追踪 |
| 🕷️ 数据采集 | 10 | Bright Data：Amazon / TikTok / 社交媒体 / 通用网页抓取 |
| 💬 HERMES 会话 | 3 | ChatGPT / Gemini / Claude / 千问 对话 |

**共 39 个工具，一个 API Key 全部搞定。**

## 快速开始

### 1. 获取 API Key

登录 [aibotspace.com](https://aibotspace.com) → 开发者设置 → 创建 API Key

### 2. 在 AI 工具中配置

#### Claude Code

编辑 `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "aibotspace": {
      "command": "npx",
      "args": ["-y", "github:aibotspace999/aibotspace-mcp"],
      "env": {
        "AIBOTSPACE_API_KEY": "sk-aibot-xxxxxxxx"
      }
    }
  }
}
```

#### Cursor

编辑 `.cursor/mcp.json` (项目级) 或 `~/.cursor/mcp.json` (全局):

```json
{
  "mcpServers": {
    "aibotspace": {
      "command": "npx",
      "args": ["-y", "github:aibotspace999/aibotspace-mcp"],
      "env": {
        "AIBOTSPACE_API_KEY": "sk-aibot-xxxxxxxx"
      }
    }
  }
}
```

#### Codex

编辑 `~/.codex/config.json`:

```json
{
  "mcpServers": {
    "aibotspace": {
      "command": "npx",
      "args": ["-y", "github:aibotspace999/aibotspace-mcp"],
      "env": {
        "AIBOTSPACE_API_KEY": "sk-aibot-xxxxxxxx"
      }
    }
  }
}
```

#### WorkBuddy

在 WorkBuddy 设置中添加 MCP 服务器：
- **名称**: `aibotspace`
- **命令**: `npx -y github:aibotspace999/aibotspace-mcp`
- **环境变量**: `AIBOTSPACE_API_KEY=sk-aibot-xxxxxxxx`

### 3. 本地开发运行

```bash
# 安装依赖
cd aibotspace-mcp
npm install

# 设置环境变量
cp .env.example .env
# 编辑 .env 填入你的 API Key

# 运行
npm run dev

# 用 MCP Inspector 调试
npm run inspect
```

### 4. 构建发布

```bash
npm run build    # TypeScript → dist/
npm start        # 运行构建后的版本
```

## 工具清单

### AI 创作 (5)

| 工具 | 说明 |
|---|---|
| `aibot_generate_image` | AI 生图（支持参考图） |
| `aibot_image_status` | 查询生图任务状态 |
| `aibot_generate_video` | AI 生视频（支持图片/视频/音频参考） |
| `aibot_video_status` | 查询生视频任务状态 |
| `aibot_get_balance` | 查询积分余额 |

### TikTok (14)

选品数据（FastMoss，只读）：

| 工具 | 说明 |
|---|---|
| `aibot_tiktok_product_search` | 商品搜索 |
| `aibot_tiktok_hot_videos` | 热门视频挖掘 |
| `aibot_tiktok_new_listed` | 新品榜 |
| `aibot_tiktok_top_selling` | 销量榜 |
| `aibot_tiktok_categories` | 分类列表 |
| `aibot_tiktok_shop_search` | 店铺搜索 |
| `aibot_tiktok_shop_products` | 店铺商品列表 |
| `aibot_tiktok_product_videos` | 商品关联视频 |

自己店铺的授权与上架：

| 工具 | 说明 |
|---|---|
| `aibot_tiktok_shop_list` | 查看已授权店铺（上架前先调这个） |
| `aibot_tiktok_shop_authorize` | 获取 OAuth 授权链接，用户浏览器打开授权 |
| `aibot_tiktok_shop_categories` | 可售叶子类目（店铺权限过滤） |
| `aibot_tiktok_shop_category_attributes` | 类目属性与必填项 |
| `aibot_tiktok_shop_warehouses` | 店铺仓库列表 |
| `aibot_tiktok_shop_publish` | 提交上架（真实创建并激活商品，进入平台审核） |

### Amazon 市场分析 (13)

| 工具 | 说明 |
|---|---|
| `aibot_keepa_product` | 商品详情 + 价格历史 |
| `aibot_keepa_finder` | ★ 蓝海选品（50+ 维度筛选） |
| `aibot_keepa_bestsellers` | 畅销榜 |
| `aibot_keepa_category` | 类目树 |
| `aibot_keepa_category_search` | 类目搜索 |
| `aibot_keepa_search` | 关键词搜索 |
| `aibot_keepa_deals` | 促销折扣 |
| `aibot_keepa_lightning` | 限时闪购 |
| `aibot_keepa_seller` | 卖家信息 |
| `aibot_keepa_seller_finder` | 卖家筛选 |
| `aibot_keepa_top_sellers` | 热门卖家榜 |
| `aibot_keepa_tracking` | 价格追踪 |
| `aibot_keepa_graph_image` | 价格历史图 |

### 数据采集 (10)

| 工具 | 说明 |
|---|---|
| `aibot_scrape_web` | 通用网页抓取 |
| `aibot_scrape_amazon_product` | Amazon 商品详情 |
| `aibot_scrape_amazon_search` | Amazon 搜索（支持筛选） |
| `aibot_scrape_amazon_reviews` | Amazon 评论 |
| `aibot_scrape_tiktok_shop` | TikTok 商品 |
| `aibot_scrape_social_media` | 社交媒体（Instagram/LinkedIn/Twitter/Facebook） |
| `aibot_scrape_ecommerce` | 通用电商（自动识别平台） |
| `aibot_scrape_walmart` | Walmart 商品 |
| `aibot_scrape_ebay` | eBay 商品 |
| `aibot_scrape_list_datasets` | 列出可用数据集 |

### HERMES 会话 (3)

| 工具 | 说明 |
|---|---|
| `aibot_chat` | AI 对话（ChatGPT / Gemini / Claude / 千问） |
| `aibot_chat_models` | 可用模型列表 |
| `aibot_chat_history` | 对话历史 |

## 配置选项

环境变量：

| 变量 | 必填 | 说明 |
|---|---|---|
| `AIBOTSPACE_API_KEY` | ✅ | API Key |
| `AIBOTSPACE_BASE_URL` | | API 地址（默认 `https://aibotspace.com`） |
| `ENABLE_GROUPS` | | 启用的工具组，逗号分隔（默认全部） |
| `LOG_LEVEL` | | 日志级别（默认 `info`） |

按组启用示例：

```json
{
  "env": {
    "AIBOTSPACE_API_KEY": "sk-aibot-xxx",
    "ENABLE_GROUPS": "creative,tiktok,keepa"
  }
}
```

## 架构

```
Claude Code / Codex / Cursor
        │
        │ MCP (stdio)
        ▼
┌───────────────────────────┐
│   aibotspace-mcp-server   │  ← 本仓库
│  39 tools, 统一认证        │
└───────────┬───────────────┘
            │ HTTPS + Bearer Token
            ▼
┌───────────────────────────┐
│  aibotspace.com API       │
│  /api/v1/images/...       │  ← 生图/视频
│  /api/v1/tiktok/...       │  ← TikTok 选品
│  /api/v1/keepa/...        │  ← Amazon 分析
│  /api/v1/scraper/...      │  ← 数据采集
│  /api/v1/chat/...         │  ← 会话模型
└───────────────────────────┘
```

## 后续扩展

新增工具组不影响已有工具的使用：

- [ ] Shopify 店铺管理
- [ ] Amazon SP-API 卖家运营
- [ ] 工作流工具（选品→生图→生视频 一键）

## License

MIT
