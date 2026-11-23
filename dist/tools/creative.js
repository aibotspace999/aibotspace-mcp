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
// 🔑 不在这里用 z.enum 硬编码模型清单：模型由服务端（后端）统一校验。
// 这样服务端新增模型后，已接入的用户无需升级/重装 MCP 即可直接使用；
// 模型名拼错会由服务端返回明确的 INVALID_MODEL 错误（而不是客户端枚举报错）。
const ImageModelSchema = z.string().describe('Image model id. Currently supported: gpt-image-2 (default, highest quality), ' +
    'nano2-0.5k / nano2-1k / nano2-2k / nano2-4k, nano-pro-1k / nano-pro-2k / nano-pro-4k. ' +
    'Newer server-side models can be passed directly without upgrading this package.');
const generateImage = {
    name: 'aibot_generate_image',
    description: `Generate AI images. Models: gpt-image-2 (highest quality), nano2/nano-pro series (faster/cheaper).
Supports reference images for image-to-image generation.
Returns URL(s) of generated image(s). For async tasks, returns task_id for polling.`,
    group: 'creative',
    inputSchema: z.object({
        prompt: z.string().describe('Text description of the image to generate'),
        model: ImageModelSchema.optional().default('gpt-image-2').describe('Image model to use'),
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
// 🔑 同上：模型清单交给服务端校验，新增模型不需要用户升级 MCP。
const VideoModelSchema = z.string().describe('Video model id. Currently supported: seedance2 (default), seedance2-mini, seedance2-fast, ' +
    'seedance2.5, minimax-h3-768p, minimax-h3-2k, muse, omni, veo, sora2. ' +
    'Newer server-side models can be passed directly without upgrading this package.');
const AspectRatioEnum = z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']);
const ResolutionEnum = z.enum(['480p', '720p', '1080p', '4k']);
// 放开到 4~60：Muse 支持 4~60 秒任意整数，omni 固定 10 秒、veo 最长 8 秒、sora2 最长 12 秒，
// seedance2 / minimax-h3 为 4~15 秒任意整数（handler 里按模型钳制并回传 note）
const DurationSchema = z.number().int().min(4).max(60);
// 🔑 2026-11-23：seedance2 / minimax-h3 上游均支持 4~15 秒任意整数秒
// （H3 官方文档：duration 4~15 整数；站内两页下拉同样为 4~15，后端统一 clamp 到 15）。
// 旧版 MCP 硬编码「只支持 5 或 10」，导致 15 秒被悄悄降级成 10 秒。
const H3_SEEDANCE_MIN_DURATION = 4;
const H3_SEEDANCE_MAX_DURATION = 15;
const generateVideo = {
    name: 'aibot_generate_video',
    description: `Generate AI videos from text and/or reference media.
Models: omni (fast, 10s fixed), seedance2 series (best quality, up to 15s), minimax-h3 (high-res), muse (Meta Muse, 4-60s, native audio), sora2, veo (Google Veo 3.1).
Supports image_urls, video_urls, audio_urls as reference material.

Model limits:
- muse: 720p fixed, aspect_ratio 16:9 / 9:16, duration 4-60s (default 10), max 4 image_urls, no video_urls/audio_urls, sound is generated natively.
- omni: 10s fixed and 720p fixed (duration/resolution tunings are ignored), aspect_ratio 16:9 / 9:16, max 7 image_urls, no video_urls/audio_urls.
- veo: max 8s per clip, resolution 720p / 1080p / 4k, up to 4 reference images; use start_frame_url + end_frame_url for first/last-frame (frames) mode.
- sora2: max 12s, aspect_ratio 16:9 / 9:16, only the first image_url is used.
- seedance2 / minimax-h3: duration 4-15s (default 5), 15s is supported.`,
    group: 'creative',
    inputSchema: z.object({
        prompt: z.string().describe('Text description of the video to generate'),
        model: VideoModelSchema.optional().default('seedance2').describe('Video model'),
        aspect_ratio: AspectRatioEnum.optional().default('16:9').describe('Video aspect ratio (muse / omni / sora2: only 16:9 / 9:16)'),
        duration: DurationSchema.optional().describe('Duration in seconds. muse: 4-60 (default 10); omni: fixed 10; veo: max 8; sora2: max 12; seedance2 / minimax-h3: 4-15 (default 5)'),
        resolution: ResolutionEnum.optional().default('720p').describe('Video resolution (muse / omni always 720p; veo supports up to 4k)'),
        generate_audio: z.boolean().optional().default(false).describe('Whether to generate audio (muse always has native audio)'),
        image_urls: z.array(z.string().url()).optional().describe('Reference image URLs (muse: max 4; omni: max 7; veo: max 4; sora2: only first used)'),
        video_urls: z.array(z.string().url()).optional().describe('Reference video URLs (not supported by muse / omni / veo / sora2)'),
        audio_urls: z.array(z.string().url()).optional().describe('Reference audio URLs (not supported by muse / omni / veo / sora2)'),
        start_frame_url: z.string().url().optional().describe('First-frame image URL, veo frames mode only'),
        end_frame_url: z.string().url().optional().describe('Last-frame image URL, veo frames mode only'),
    }),
    handler: async (params, client) => {
        const isMuse = params.model === 'muse';
        const isOmni = params.model === 'omni';
        const isVeo = params.model === 'veo';
        const isSora = params.model === 'sora2';
        const notes = [];
        let aspectRatio = params.aspect_ratio;
        let resolution = params.resolution;
        let duration = params.duration ?? (isMuse ? 10 : (isOmni ? 10 : (isVeo ? 8 : (isSora ? 12 : 5))));
        // muse / omni / sora2 都只有横竖两档
        const clampAspect = (name) => {
            if (aspectRatio !== '16:9' && aspectRatio !== '9:16') {
                notes.push(`${name} only supports 16:9 / 9:16, submitted as 16:9 (requested ${aspectRatio})`);
                aspectRatio = '16:9';
            }
        };
        if (isMuse) {
            // 上游硬限制，先在本地下手钳制，避免用户拿到和预期不符的成片
            clampAspect('muse');
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
        else if (isOmni) {
            clampAspect('omni');
            if (resolution !== '720p') {
                notes.push(`omni is fixed at 720p, resolution "${resolution}" ignored`);
                resolution = '720p';
            }
            if (duration !== 10) {
                notes.push(`omni is fixed at 10s, duration ${duration} ignored`);
                duration = 10;
            }
            if (params.image_urls && params.image_urls.length > 7) {
                notes.push(`omni accepts at most 7 reference images, extra ${params.image_urls.length - 7} dropped`);
            }
            if (params.video_urls?.length || params.audio_urls?.length) {
                notes.push('omni does not accept video_urls / audio_urls, they were ignored');
            }
        }
        else if (isVeo) {
            if (duration > 8) {
                notes.push(`veo clips are at most 8s, duration ${duration} submitted as 8`);
                duration = 8;
            }
            if (resolution !== '720p' && resolution !== '1080p' && resolution !== '4k') {
                notes.push(`veo does not support "${resolution}", submitted as 720p`);
                resolution = '720p';
            }
            if (params.image_urls && params.image_urls.length > 4) {
                notes.push(`veo accepts at most 4 reference images, extra dropped`);
            }
            if (params.video_urls?.length || params.audio_urls?.length) {
                notes.push('veo does not accept video_urls / audio_urls, they were ignored');
            }
        }
        else if (isSora) {
            clampAspect('sora2');
            if (duration > 12) {
                notes.push(`sora2 clips are at most 12s, duration ${duration} submitted as 12`);
                duration = 12;
            }
            if (params.image_urls && params.image_urls.length > 1) {
                notes.push(`sora2 only uses the first image_url, extra ${params.image_urls.length - 1} dropped`);
            }
        }
        else if (duration < H3_SEEDANCE_MIN_DURATION || duration > H3_SEEDANCE_MAX_DURATION) {
            const clamped = Math.min(H3_SEEDANCE_MAX_DURATION, Math.max(H3_SEEDANCE_MIN_DURATION, Math.round(duration)));
            notes.push(`seedance2 / minimax-h3 support ${H3_SEEDANCE_MIN_DURATION}-${H3_SEEDANCE_MAX_DURATION}s, duration ${duration} submitted as ${clamped}`);
            duration = clamped;
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
            ...(params.start_frame_url ? { start_frame_url: params.start_frame_url } : {}),
            ...(params.end_frame_url ? { end_frame_url: params.end_frame_url } : {}),
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