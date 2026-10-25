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

import { z } from 'zod';
import type { ToolDefinition, ToolGroupModule } from './register.js';
import type { AibotSpaceClient } from '../client.js';

const ChatModelEnum = z.enum(['chatgpt', 'gemini', 'claude', 'qwen'])
  .describe('chatgpt=OpenAI, gemini=Google, claude=Anthropic, qwen=Alibaba Qwen');

// ─── Chat Completion ──────────────────────────────

const chatCompletion: ToolDefinition = {
  name: 'aibot_chat',
  description: `AI chat completion using 4 models: ChatGPT, Gemini, Claude, Qwen.
Supports multi-turn conversation, system prompts, and streaming.
Each model has different strengths - Claude for analysis, GPT for general tasks, Gemini for multimodal, Qwen for Chinese.`,
  group: 'chat',
  inputSchema: z.object({
    model: ChatModelEnum.default('chatgpt'),
    messages: z.array(z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string(),
    })).min(1).describe('Conversation messages'),
    max_tokens: z.number().int().optional().describe('Maximum response tokens'),
    temperature: z.number().min(0).max(2).optional().default(0.7),
    stream: z.boolean().optional().default(false).describe('Enable streaming response'),
  }),
  handler: async (params, client) => {
    const result = await client.post<any>('/api/v1/chat/completions', {
      model: params.model,
      messages: params.messages,
      max_tokens: params.max_tokens,
      temperature: params.temperature,
      stream: false, // MCP doesn't support streaming well, always use non-stream
    });

    // OpenAI-compatible response format
    if (result.choices?.[0]) {
      const choice = result.choices[0];
      return JSON.stringify({
        content: choice.message?.content || '',
        model: result.model,
        usage: result.usage,
        finish_reason: choice.finish_reason,
      }, null, 2);
    }

    return JSON.stringify(result, null, 2);
  },
};

// ─── List Available Models ──────────────────────────────

const listModels: ToolDefinition = {
  name: 'aibot_chat_models',
  description: 'List available chat models with their configuration status, pricing, and capabilities.',
  group: 'chat',
  inputSchema: z.object({}),
  handler: async (_params, client) => {
    try {
      const result = await client.get<any>('/api/v1/chat/models');
      return JSON.stringify(result, null, 2);
    } catch {
      // Fallback: return static model info
      return JSON.stringify({
        models: [
          { id: 'chatgpt', label: 'ChatGPT', apiStyle: 'openai', description: 'General-purpose, strong at reasoning and code' },
          { id: 'gemini', label: 'Google Gemini', apiStyle: 'gemini', description: 'Multimodal, good at analysis' },
          { id: 'claude', label: 'Claude', apiStyle: 'anthropic', description: 'Strong at analysis, writing, and long context' },
          { id: 'qwen', label: 'Qwen', apiStyle: 'openai', description: 'Alibaba model, excellent for Chinese content' },
        ],
      }, null, 2);
    }
  },
};

// ─── Conversation History (placeholder) ──────────────────────────────

const chatHistory: ToolDefinition = {
  name: 'aibot_chat_history',
  description: 'Get recent chat conversation history for the current user.',
  group: 'chat',
  inputSchema: z.object({
    model: ChatModelEnum.optional().describe('Filter by model'),
    limit: z.number().int().optional().default(10).describe('Number of conversations to return'),
  }),
  handler: async (params, client) => {
    try {
      const result = await client.get<any>('/desktop/chat/history', {
        model: params.model || '',
        limit: String(params.limit || 10),
      });
      return JSON.stringify(result, null, 2);
    } catch {
      return JSON.stringify({ message: 'Chat history not available via MCP API. Conversations are stored locally in the HERMES desktop app.' }, null, 2);
    }
  },
};

// ─── Group ──────────────────────────────────────────

export const chatGroup: ToolGroupModule = {
  group: 'chat',
  label: 'HERMES AI Chat',
  register() {
    return [chatCompletion, listModels, chatHistory];
  },
};
