# AIBotSpace Open API v1 文档

> **Base URL**: `https://aibotspace.com`
> **认证方式**: `Authorization: Bearer sk-aibot-xxxxxxxx`
> **Content-Type**: `application/json`

---

## 1. 账户余额

### GET /api/v1/credits/balance

查询 API Key 对应账户的积分余额。

**响应示例**:
```json
{
  "object": "credits",
  "balance": 137465,
  "currency": "points"
}
```

---

## 2. AI 生图

### POST /api/v1/images/generations

生成图片。支持多种模型。

**请求体**:
```json
{
  "model": "gpt-image-2",
  "prompt": "A professional product photo of a smart ring on marble",
  "n": 1,
  "size": "1024x1024",
  "reference_images": ["https://example.com/product.jpg"]
}
```

**可用模型**:
| 模型 | 说明 |
|---|---|
| `gpt-image-2` | 高质量，支持参考图 |
| `nano2-0.5k` / `nano2-1k` / `nano2-2k` / `nano2-4k` | NANO2 系列（不同分辨率） |
| `nano-pro-1k` / `nano-pro-2k` | NANO PRO 系列 |

**响应（同步）**:
```json
{
  "data": [{ "url": "https://oss.aibotspace.com/batch_upload/20260929/xxx.jpg" }]
}
```

**响应（异步，大模型）**:
```json
{ "task_id": "task_xxx", "status": "processing" }
```

### GET /api/v1/images/:taskId

查询图片生成任务状态。

**响应**:
```json
{
  "status": "succeeded",
  "output": ["https://oss.aibotspace.com/batch_upload/20260929/xxx.jpg"]
}
```

---

## 3. AI 生视频

### POST /api/v1/videos/generations

生成视频。

**请求体**:
```json
{
  "model": "seedance2",
  "prompt": "A smart ring rotating on a velvet display",
  "image_url": "https://example.com/product.jpg",
  "duration": 5
}
```

**可用模型**:
| 模型 | 说明 |
|---|---|
| `omni` | 通用视频生成 |
| `seedance2` / `seedance2-mini` / `seedance2-fast` | Seedance 2.0 系列 |
| `seedance2.5` | Seedance 2.5 |
| `minimax-h3-768p` / `minimax-h3-2k` | MiniMax H3 |
| `sora2` | OpenAI Sora 2 |
| `veo` | Google Veo |

**响应**: 同图片，返回 `task_id` 或同步结果。

### GET /api/v1/videos/:taskId

查询视频生成任务状态。

---

## 4. TikTok 选品 (FastMoss)

### GET /api/v1/tiktok/category/list

获取 TikTok Shop 商品分类列表。

**参数**: `?region=US`（US/UK/ID/MY/TH/VN/PH/SG）

**响应**:
```json
{
  "success": true,
  "data": [{ "id": "100001", "name": "Beauty", "children": [...] }]
}
```

### POST /api/v1/tiktok/product/search

按关键词搜索 TikTok 商品。

**请求体**:
```json
{
  "keyword": "smart ring",
  "region": "US",
  "page": 1,
  "pageSize": 20,
  "min_price": 10,
  "max_price": 50
}
```

### POST /api/v1/tiktok/hot-videos

获取热门 TikTok 视频。

**请求体**:
```json
{
  "keyword": "jewelry",
  "region": "US",
  "page": 1,
  "pageSize": 20
}
```

### POST /api/v1/tiktok/product/rank/new-listed

新品上架榜单。

**请求体**:
```json
{
  "region": "US",
  "categoryId": "100001",
  "page": 1,
  "pageSize": 20
}
```

### POST /api/v1/tiktok/product/rank/top-selling

销量排行榜。

**请求体**: 同上。

### POST /api/v1/tiktok/shop/search

搜索 TikTok 店铺。

**请求体**:
```json
{
  "keyword": "smart",
  "region": "US",
  "page": 1,
  "pageSize": 20
}
```

### POST /api/v1/tiktok/shop/product-list

获取店铺内商品列表。

**请求体**:
```json
{
  "shopId": "xxx",
  "region": "US",
  "page": 1,
  "pageSize": 20
}
```

### POST /api/v1/tiktok/product/video-list

获取商品关联的视频。

**请求体**:
```json
{
  "productId": "xxx",
  "region": "US",
  "page": 1,
  "pageSize": 20
}
```

---

## 5. Amazon 市场分析 (Keepa)

### POST /api/v1/keepa/call

通用 Keepa 接口入口。通过 `toolName` 指定具体功能。

**请求体**:
```json
{
  "toolName": "product",
  "params": { "asins": "B0D1XD8ZV3", "domain": 1 }
}
```

**可用 toolName**:

| toolName | 功能 | params 示例 |
|---|---|---|
| `product` | 商品详情 + 价格历史 | `{ "asins": "B0XXX" 或 ["B0XX","B0YY"], "domain": 1 }` |
| `query` | ★ 蓝海选品（50+ 筛选条件） | `{ "domain": 1, "max_salesRank_30d": 50000, "min_price": 1500, "max_reviewCount": 50 }` |
| `bestsellers` | 畅销榜 | `{ "domain": 1, "category": 1234 }` |
| `category` | 类目树 | `{ "domain": 1, "category": 0 }` |
| `categorysearch` | 类目搜索 | `{ "domain": 1, "term": "electronics" }` |
| `search` | 关键词搜索 | `{ "domain": 1, "term": "smart ring", "type": "product" }` |
| `deal` | 折扣商品 | `{ "domain": 1, "page": 0 }` |
| `lightningdeal` | 闪电促销 | `{ "domain": 1 }` |
| `seller` | 卖家信息 | `{ "seller": "A2XXX", "domain": 1 }` |
| `sellerquery` | 搜索卖家 | `{ "domain": 1, "term": "Anker" }` |
| `topseller` | 卖家畅销榜 | `{ "seller": "A2XXX", "domain": 1 }` |
| `tracking` | 价格追踪 | `{ "asins": ["B0XXX"], "domain": 1 }` |
| `graphimage` | 生成价格走势图 | `{ "asin": "B0XXX", "domain": 1 }` |

**domain 值**: 1=US, 2=UK, 3=DE, 4=FR, 5=JP, 6=CA, 7=IT, 8=ES, 9=IN, 10=MX, 11=BR, 12=AU

---

## 6. 数据采集 (Bright Data)

### POST /api/v1/scraper/call

通用数据采集接口。

**请求体**:
```json
{
  "toolName": "web_scraper",
  "params": { "url": "https://example.com" }
}
```

**可用 toolName**:

| toolName | 功能 | params |
|---|---|---|
| `web_scraper` | 通用网页抓取 | `{ "url": "https://..." }` |
| `amazon_product` | Amazon 商品详情 | `{ "url": "https://www.amazon.com/dp/B0XXX" }` |
| `amazon_search` | Amazon 搜索结果 | `{ "url": "https://www.amazon.com/s?k=..." }` |
| `amazon_reviews` | Amazon 评论 | `{ "url": "https://www.amazon.com/product-reviews/B0XXX" }` |
| `tiktok_shop` | TikTok Shop 商品 | `{ "url": "https://..." }` |
| `walmart` | Walmart 商品 | `{ "url": "https://www.walmart.com/ip/..." }` |
| `ebay` | eBay 商品 | `{ "url": "https://www.ebay.com/itm/..." }` |

### POST /api/v1/scraper/list

列出所有可用的 Bright Data 数据集。

**请求体**: `{}`

### POST /api/v1/scraper/details

查询数据集 schema。

**请求体**: `{ "datasetId": "gd_xxx" }`

### POST /api/v1/scraper/filter

数据集筛选。

**请求体**: `{ "datasetId": "gd_xxx", "filters": { ... } }`

---

## 7. AI 会话

### GET /api/v1/chat/models

获取可用模型列表。

**响应**:
```json
{
  "success": true,
  "models": [
    { "id": "chatgpt", "name": "ChatGPT", "apiStyle": "openai" },
    { "id": "gemini", "name": "Gemini", "apiStyle": "gemini" },
    { "id": "claude", "name": "Claude", "apiStyle": "anthropic" },
    { "id": "qwen", "name": "Qwen", "apiStyle": "openai" }
  ]
}
```

### POST /api/v1/chat/completions

OpenAI 兼容格式的对话接口。

**请求体**:
```json
{
  "model": "chatgpt",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello!" }
  ],
  "max_tokens": 1000,
  "temperature": 0.7,
  "stream": false
}
```

**可用 model**: `chatgpt`, `gemini`, `claude`, `qwen`

**响应（非流式）**:
```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "model": "gpt-4o",
  "choices": [{
    "index": 0,
    "message": { "role": "assistant", "content": "Hello! How can I help you?" },
    "finish_reason": "stop"
  }],
  "usage": { "prompt_tokens": 20, "completion_tokens": 10, "total_tokens": 30 }
}
```

---

## 错误处理

所有接口返回统一错误格式：
```json
{
  "error": "错误描述信息"
}
```

或（Chat 接口）:
```json
{
  "error": { "message": "错误描述", "type": "invalid_request_error" }
}
```

**常见错误码**:
| 状态码 | 含义 |
|---|---|
| 400 | 参数错误 |
| 401 | API Key 无效或已撤销 |
| 402 | 余额不足 |
| 429 | 请求频率超限 |
| 500 | 服务端错误 |
| 503 | 功能未启用 |

---

## Agent 使用示例

### 示例 1: 市场调研 + 生成产品图

```javascript
// 1. 搜索 TikTok 热门商品
const products = await fetch('https://aibotspace.com/api/v1/tiktok/product/search', {
  method: 'POST',
  headers: authHeaders,
  body: JSON.stringify({ keyword: 'smart ring', region: 'US', pageSize: 10 })
}).then(r => r.json());

// 2. 用 Keepa 查 Amazon 竞品
const keepaData = await fetch('https://aibotspace.com/api/v1/keepa/call', {
  method: 'POST',
  headers: authHeaders,
  body: JSON.stringify({
    toolName: 'product',
    params: { asins: 'B0D1XD8ZV3', domain: 1 }
  })
}).then(r => r.json());

// 3. 生成产品营销图
const image = await fetch('https://aibotspace.com/api/v1/images/generations', {
  method: 'POST',
  headers: authHeaders,
  body: JSON.stringify({
    model: 'gpt-image-2',
    prompt: 'Professional product photo of smart ring',
    size: '1024x1024'
  })
}).then(r => r.json());
```

### 示例 2: 用 AI 分析市场数据

```javascript
// 1. 获取 Keepa 选品数据
const finder = await fetch('https://aibotspace.com/api/v1/keepa/call', {
  method: 'POST',
  headers: authHeaders,
  body: JSON.stringify({
    toolName: 'query',
    params: {
      domain: 1,
      max_salesRank_30d: 50000,
      min_price: 1500,
      max_price: 5000,
      max_reviewCount: 100,
      min_monthlySales: 100
    }
  })
}).then(r => r.json());

// 2. 用 AI 分析数据
const analysis = await fetch('https://aibotspace.com/api/v1/chat/completions', {
  method: 'POST',
  headers: authHeaders,
  body: JSON.stringify({
    model: 'claude',
    messages: [{
      role: 'user',
      content: `分析以下蓝海选品数据，给出 Top 5 推荐：\n${JSON.stringify(finder)}`
    }]
  })
}).then(r => r.json());
```
