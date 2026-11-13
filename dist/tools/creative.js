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
const generateImage = {
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
        const result = await client.post('/api/v1/images/generations', {
            prompt: params.prompt,
            model: params.model,
            size: params.size,
            n: params.n,
            reference_images: params.reference_images,
        });
        // Synchronous result
        if (result.data && result.data.length > 0) {
            const urls = result.data.map((d) => d.url).filter(Boolean);
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
const imageStatus = {
    name: 'aibot_image_status',
    description: 'Check the status of an async image generation task. Returns completed URLs when ready.',
    group: 'creative',
    inputSchema: z.object({
        task_id: z.string().describe('Task ID returned from aibot_generate_image'),
    }),
    handler: async (params, client) => {
        const result = await client.get(`/api/v1/images/${params.task_id}`);
        if (['succeeded', 'completed', 'done'].includes(result.status)) {
            const urls = (result.data || []).map((d) => d.url || d).filter(Boolean);
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
    'muse',
    'sora2', 'veo',
]);
const AspectRatioEnum = z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']);
const ResolutionEnum = z.enum(['480p', '720p', '1080p']);
// 放开到 4~60：Muse 支持 4~60 秒任意整数，其他模型只认 5 / 10（handler 里自动归位）
const DurationSchema = z.number().int().min(4).max(60);
const generateVideo = {
    name: 'aibot_generate_video',
    description: `Generate AI videos from text and/or reference media.
Models: omni (fast, 10s fixed), seedance2 series (best quality, up to 15s), minimax-h3 (high-res), muse (Meta Muse, 4-60s, 720p, native audio), sora2, veo.
Supports image_urls, video_urls, audio_urls as reference material.

Model limits:
- muse: 720p fixed, aspect_ratio only 16:9 / 9:16, duration 4-60s (default 10), max 4 image_urls, no video_urls/audio_urls, sound is generated natively (generate_audio ignored).
- seedance2 / minimax-h3 / omni: duration 5 or 10 only (default 5).`,
    group: 'creative',
    inputSchema: z.object({
        prompt: z.string().describe('Text description of the video to generate'),
        model: VideoModelEnum.optional().default('seedance2').describe('Video model'),
        aspect_ratio: AspectRatioEnum.optional().default('16:9').describe('Video aspect ratio (muse: only 16:9 / 9:16)'),
        duration: DurationSchema.optional().describe('Duration in seconds. muse: 4-60 (default 10); other models: 5 or 10 (default 5)'),
        resolution: ResolutionEnum.optional().default('720p').describe('Video resolution (muse is always 720p)'),
        generate_audio: z.boolean().optional().default(false).describe('Whether to generate audio (muse always has native audio)'),
        image_urls: z.array(z.string().url()).optional().describe('Reference image URLs (muse: max 4)'),
        video_urls: z.array(z.string().url()).optional().describe('Reference video URLs (not supported by muse)'),
        audio_urls: z.array(z.string().url()).optional().describe('Reference audio URLs (not supported by muse)'),
    }),
    handler: async (params, client) => {
        const isMuse = params.model === 'muse';
        const notes = [];
        let aspectRatio = params.aspect_ratio;
        let resolution = params.resolution;
        let duration = params.duration ?? (isMuse ? 10 : 5);
        if (isMuse) {
            // 上游硬限制，先在本地下手钳制，避免用户拿到和预期不符的成片
            if (aspectRatio !== '16:9' && aspectRatio !== '9:16') {
                notes.push(`muse only supports 16:9 / 9:16, submitted as 16:9 (requested ${aspectRatio})`);
                aspectRatio = '16:9';
            }
            if (resolution !== '720p') {
                notes.push(`muse is fixed at 720p, resolution "${resolution}" ignored`);
                resolution = '720p';
            }
            if (params.image_urls && params.image_urls.length > 4) {
                throw new Error('muse accepts at most 4 reference images in image_urls');
            }
            if (params.video_urls?.length || params.audio_urls?.length) {
                notes.push('muse does not accept video_urls / audio_urls, they were ignored');
            }
        }
        else if (duration !== 5 && duration !== 10) {
            const snapped = duration <= 5 ? 5 : 10;
            notes.push(`this model supports 5s or 10s only, duration ${duration} submitted as ${snapped}`);
            duration = snapped;
        }
        const result = await client.post('/api/v1/videos/generations', {
            prompt: params.prompt,
            model: params.model,
            aspect_ratio: aspectRatio,
            duration,
            resolution,
            generate_audio: params.generate_audio,
            image_urls: params.image_urls,
            video_urls: params.video_urls,
            audio_urls: params.audio_urls,
        });
        if (result._meta?.task_id) {
            // 服务端可能继续纠偏（例如 muse 时长钳到 4~60），把它返回的 warnings 一并透出
            const serverNotes = result._meta?.warnings || [];
            return JSON.stringify({
                status: result._meta?.status || 'processing',
                task_id: result._meta.task_id,
                model: result.model || params.model,
                duration: result._meta?.duration ?? duration,
                resolution: result._meta?.resolution ?? resolution,
                aspect_ratio: result._meta?.aspect_ratio ?? aspectRatio,
                estimated_time: result._meta?.estimated_time || '2-5 minutes',
                points_charged: result._meta?.points_charged,
                ...(notes.length || serverNotes.length ? { warnings: [...notes, ...serverNotes] } : {}),
                message: 'Video generation in progress. Use aibot_video_status to check result.',
            }, null, 2);
        }
        return JSON.stringify(result, null, 2);
    },
};
// ─── Video Status ──────────────────────────────────────────
const videoStatus = {
    name: 'aibot_video_status',
    description: 'Check the status of an async video generation task. Returns video URL when completed.',
    group: 'creative',
    inputSchema: z.object({
        task_id: z.string().describe('Task ID from aibot_generate_video'),
    }),
    handler: async (params, client) => {
        const result = await client.get(`/api/v1/videos/${params.task_id}`);
        if (['succeeded', 'completed', 'done'].includes(result.status)) {
            const urls = (result.data || []).map((d) => d.url || d).filter(Boolean);
            return JSON.stringify({ status: 'completed', videos: urls }, null, 2);
        }
        if (result.status === 'failed') {
            return JSON.stringify({ status: 'failed', error: result.error || 'Generation failed' }, null, 2);
        }
        return JSON.stringify({ status: result.status || 'processing', message: 'Still generating, check again in 10-15 seconds' }, null, 2);
    },
};
// ─── Balance ──────────────────────────────────────────
const getBalance = {
    name: 'aibot_get_balance',
    description: 'Check the current credit balance for the AIBotSpace account.',
    group: 'creative',
    inputSchema: z.object({}),
    handler: async (_params, client) => {
        const result = await client.get('/api/v1/credits/balance');
        return JSON.stringify(result, null, 2);
    },
};
// ─── Group ──────────────────────────────────────────
export const creativeGroup = {
    group: 'creative',
    label: 'AI Creation',
    register() {
        return [generateImage, imageStatus, generateVideo, videoStatus, getBalance];
    },
};
//# sourceMappingURL=creative.js.map