/**
 * AIBotSpace MCP Server - Configuration
 *
 * Tool groups can be selected in three ways, in priority order:
 *   1. CLI flag:      --preset shop        (or --preset=shop, --preset shop,video)
 *   2. Environment:   AIBOTSPACE_PRESET=shop
 *   3. Environment:   ENABLE_GROUPS=tiktok-shop,creative
 * If none is set, every group is enabled.
 */
/** Fine-grained group ids. Each maps to one ToolGroupModule. */
export const ALL_GROUPS = [
    'creative',
    'tiktok-research',
    'tiktok-shop',
    'keepa',
    'scraper',
    'chat',
];
/**
 * Named bundles. These are what users actually type, so keep the names short
 * and mapped to a use case rather than to an internal module name.
 */
export const PRESETS = {
    all: [...ALL_GROUPS],
    /** Own TikTok Shop: auth, publish, orders, shipping, returns, analytics (25 tools) */
    shop: ['tiktok-shop'],
    /** Find products / shops / videos + Amazon Keepa data (21 tools) */
    research: ['tiktok-research', 'keepa'],
    /** Image & video generation (5 tools) */
    video: ['creative'],
    /** Web scraping via Bright Data (10 tools) */
    scrape: ['scraper'],
    /** Generic AI chat (3 tools) */
    chat: ['chat'],
};
export const PRESET_NAMES = Object.keys(PRESETS);
/**
 * `ENABLE_GROUPS=tiktok` used to mean "the 33 TikTok tools" (market research
 * merged with own-shop ops). The two halves are now separate groups, so the old
 * value expands to both halves — existing configs keep working unchanged.
 * New users pick the precise group instead: `tiktok-research` or `tiktok-shop`.
 */
const LEGACY_GROUP_ALIASES = {
    tiktok: ['tiktok-research', 'tiktok-shop'],
};
function expandGroup(raw) {
    const name = raw.trim();
    if (!name)
        return [];
    const alias = LEGACY_GROUP_ALIASES[name];
    return alias ? alias : [name];
}
function readPresetArg(argv) {
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--preset')
            return argv[i + 1] || null;
        if (a.startsWith('--preset='))
            return a.slice('--preset='.length) || null;
    }
    return null;
}
/**
 * Resolve a preset spec like "shop" or "shop,video" into group ids.
 * Unknown names are reported instead of silently enabling everything.
 */
export function resolvePreset(spec) {
    const wanted = spec.split(',').map((s) => s.trim()).filter(Boolean);
    const groups = new Set();
    const unknown = [];
    for (const name of wanted) {
        const preset = PRESETS[name];
        if (preset) {
            for (const g of preset)
                groups.add(g);
        }
        else if (ALL_GROUPS.includes(name)) {
            // Allow raw group ids too, so `--preset tiktok-shop` works.
            groups.add(name);
        }
        else {
            unknown.push(name);
        }
    }
    return { groups: [...groups], unknown };
}
export function resolveEnabledGroups() {
    const presetSpec = readPresetArg(process.argv) || process.env.AIBOTSPACE_PRESET || null;
    if (presetSpec) {
        const { groups, unknown } = resolvePreset(presetSpec);
        if (unknown.length) {
            console.error(`[aibotspace-mcp] WARNING: unknown preset or group: ${unknown.join(', ')}. ` +
                `Available presets: ${PRESET_NAMES.join(', ')}`);
        }
        if (groups.length) {
            return { groups: new Set(groups), preset: presetSpec, source: 'preset' };
        }
        console.error('[aibotspace-mcp] WARNING: preset resolved to zero groups, falling back to all');
    }
    const groupsRaw = process.env.ENABLE_GROUPS || '';
    if (groupsRaw.trim()) {
        const groups = new Set(groupsRaw.split(',').flatMap(expandGroup));
        return { groups, preset: null, source: 'ENABLE_GROUPS' };
    }
    return { groups: new Set(ALL_GROUPS), preset: null, source: 'default (all)' };
}
export function loadConfig() {
    const apiKey = process.env.AIBOTSPACE_API_KEY || '';
    if (!apiKey) {
        console.error('[aibotspace-mcp] ERROR: AIBOTSPACE_API_KEY is required');
        console.error('[aibotspace-mcp] Get your key at https://aibotspace.com');
        process.exit(1);
    }
    const baseUrl = (process.env.AIBOTSPACE_BASE_URL || 'https://aibotspace.com').replace(/\/+$/, '');
    const { groups, preset, source } = resolveEnabledGroups();
    return {
        apiKey,
        baseUrl,
        enabledGroups: groups,
        preset,
        logLevel: process.env.LOG_LEVEL || 'info',
    };
}
//# sourceMappingURL=config.js.map