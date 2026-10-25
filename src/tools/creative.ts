/**
 * Creative tools - AI image & video generation
 *
 * Calls AIBotSpace Open API:
 *   POST /api/v1/images/generations
 *   POST /api/v1/videos/generations
 *   GET  /api/v1/images/:taskId
 *   GET  /api/v1/videos/:taskId
 *   GET  /api/v1/credits/balance
 */

import { z } from 'zod';
import type { ToolGroupModule, ToolDefinition } from './register.js';
import type { AibotSpaceClient } from '../client.js';
import type { Config } from '../config.js';

// ─── Image Generation ──────────────────────────────────────────

const ImageSizeEnum = z.enum([
  '1024x1024', '1024x1792', '1792x1024',
  '1536x1024', '1024x1536',
  '1280x1024', '1024x1280',
  '2048x876',
  '512x512', '2048x2048', '4096x4096',
]);

const ImageModelEnum = z.enum([
  'gpt-image-2',
  'nano2-0.5k', 'nano2-1k', 'nano2-2k', 'nano2-4k',
  'nano-pro-1k', 'nano-pro-2k', 'nano-pro-4k',
]);

const generateImage: ToolDefinition = {
  name: 'aibot_generate_image',
  description: `Generate AI images. Models: gpt-image-2 (highest quality), nano2/nano-pro series (faster/cheaper).
Supports reference images for image-to-image generation.
Returns URL(s) of generated image(s). For async tasks, returns task_id for polling.`,
  group: 'creative',
  inputSchema: z.object({
    prompt: z.string().describe('Text description of the image to generate'),
    model: ImageModelEnum.optional().default('gpt-image-2').describe('Image model to use'),
    size: ImageSizeEnum.optional().default('1024x1024').describe('Image dimensions'),
    n: z.number().int().min(1).max(4).optional().default(1).describe('Number of images to generate'),
    reference_images: z.array(z.string().url()).optional().describe('Reference image URLs for image-to-image'),
  }),
  handler: async (params, client) => {
    const result = await client.post<any>('/api/v1/images/generations', {
      prompt: params.prompt,
      model: params.model,
      size: params.size,
      n: params.n,
      reference_images: params.reference_images,
    });

    // Synchronous result
    if (result.data && result.data.length > 0) {
      const urls = result.data.map((d: any) => d.url).filter(Boolean);
      return JSON.stringify({
        status: 'completed',
        model: result.model,
        images: urls,
        revised_prompt: result.data[0]?.revised_prompt,
        points_charged: result._meta?.points_charged,
      }, null, 2);
    }

    // Async result - return task_id for polling
    if (result._meta?.task_id) {
      return JSON.stringify({
        status: 'processing',
        task_id: result._meta.task_id,
        model: result.model,
        message: 'Image generation in progress. Use aibot_image_status to check result.',
        points_charged: result._meta?.points_charged,
      }, null, 2);
    }

    return JSON.stringify(result, null, 2);
  },
};

// ─── Image Status ──────────────────────────────────────────

const imageStatus: ToolDefinition = {
  name: 'aibot_image_status',
  description: 'Check the status of an async image generation task. Returns completed URLs when ready.',
  group: 'creative',
  inputSchema: z.object({
    task_id: z.string().describe('Task ID returned from aibot_generate_image'),
  }),
  handler: async (params, client) => {
    const result = await client.get<any>(`/api/v1/images/${params.task_id}`);

    if (['succeeded', 'completed', 'done'].includes(result.status)) {
      const urls = (result.data || []).map((d: any) => d.url || d).filter(Boolean);
      return JSON.stringify({ status: 'completed', images: urls }, null, 2);
    }
    if (result.status === 'failed') {
      return JSON.stringify({ status: 'failed', error: result.error || 'Generation failed' }, null, 2);
    }
    return JSON.stringify({ status: result.status || 'processing', message: 'Still generating, check again in 5-10 seconds' }, null, 2);
  },
};

// ─── Video Generation ──────────────────────────────────────────

const VideoModelEnum = z.enum([
  'omni', 'seedance2', 'seedance2-mini', 'seedance2-fast', 'seedance2.5',
  'minimax-h3-768p', 'minimax-h3-2k',
  'sora2', 'veo',
]);

const AspectRatioEnum = z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']);
const ResolutionEnum = z.enum(['480p', '720p', '1080p']);
const DurationSchema = z.union([z.literal(5), z.literal(10)]);

const generateVideo: ToolDefinition = {
  name: 'aibot_generate_video',
  description: `Generate AI videos from text and/or reference media.
Models: omni (fast, 10s fixed), seedance2 series (best quality, up to 15s), minimax-h3 (high-res), sora2, veo.
Supports image_urls, video_urls, audio_urls as reference material.`,
  group: 'creative',
  inputSchema: z.object({
    prompt: z.string().describe('Text description of the video to generate'),
    model: VideoModelEnum.optional().default('seedance2').describe('Video model'),
    aspect_ratio: AspectRatioEnum.optional().default('16:9').describe('Video aspect ratio'),
    duration: DurationSchema.optional().default(5).describe('Duration in seconds (5 or 10)'),
    resolution: ResolutionEnum.optional().default('720p').describe('Video resolution'),
    generate_audio: z.boolean().optional().default(false).describe('Whether to generate audio'),
    image_urls: z.array(z.string().url()).optional().describe('Reference image URLs'),
    video_urls: z.array(z.string().url()).optional().describe('Reference video URLs'),
    audio_urls: z.array(z.string().url()).optional().describe('Reference audio URLs'),
  }),
  handler: async (params, client) => {
    const result = await client.post<any>('/api/v1/videos/generations', {
      prompt: params.prompt,
      model: params.model,
      aspect_ratio: params.aspect_ratio,
      duration: params.duration,
      resolution: params.resolution,
      generate_audio: params.generate_audio,
      image_urls: params.image_urls,
      video_urls: params.video_urls,
      audio_urls: params.audio_urls,
    });

    if (result._meta?.task_id) {
      return JSON.stringify({
        status: result._meta?.status || 'processing',
        task_id: result._meta.task_id,
        model: result.model || params.model,
        estimated_time: result._meta?.estimated_time || '2-5 minutes',
        points_charged: result._meta?.points_charged,
        message: 'Video generation in progress. Use aibot_video_status to check result.',
      }, null, 2);
    }

    return JSON.stringify(result, null, 2);
  },
};

// ─── Video Status ──────────────────────────────────────────

const videoStatus: ToolDefinition = {
  name: 'aibot_video_status',
  description: 'Check the status of an async video generation task. Returns video URL when completed.',
  group: 'creative',
  inputSchema: z.object({
    task_id: z.string().describe('Task ID from aibot_generate_video'),
  }),
  handler: async (params, client) => {
    const result = await client.get<any>(`/api/v1/videos/${params.task_id}`);

    if (['succeeded', 'completed', 'done'].includes(result.status)) {
      const urls = (result.data || []).map((d: any) => d.url || d).filter(Boolean);
      return JSON.stringify({ status: 'completed', videos: urls }, null, 2);
    }
    if (result.status === 'failed') {
      return JSON.stringify({ status: 'failed', error: result.error || 'Generation failed' }, null, 2);
    }
    return JSON.stringify({ status: result.status || 'processing', message: 'Still generating, check again in 10-15 seconds' }, null, 2);
  },
};

// ─── Balance ──────────────────────────────────────────

const getBalance: ToolDefinition = {
  name: 'aibot_get_balance',
  description: 'Check the current credit balance for the AIBotSpace account.',
  group: 'creative',
  inputSchema: z.object({}),
  handler: async (_params, client) => {
    const result = await client.get<any>('/api/v1/credits/balance');
    return JSON.stringify(result, null, 2);
  },
};

// ─── Group ──────────────────────────────────────────

export const creativeGroup: ToolGroupModule = {
  group: 'creative',
  label: 'AI Creation',
  register() {
    return [generateImage, imageStatus, generateVideo, videoStatus, getBalance];
  },
};
