/**
 * Chat tools - HERMES AI conversation models
 *
 * 4 models: ChatGPT (OpenAI), Gemini (Google), Claude (Anthropic), Qwen (DashScope)
 * The backend proxies to respective APIs with token-based billing.
 *
 * Calls AIBotSpace internal endpoint:
 *   POST /api/v1/chat/completions (OpenAI-compatible format)
 *   GET  /api/v1/chat/models
 */
import type { ToolGroupModule } from './register.js';
export declare const chatGroup: ToolGroupModule;
//# sourceMappingURL=chat.d.ts.map