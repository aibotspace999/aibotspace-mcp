/**
 * AIBotSpace HTTP Client - thin wrapper around fetch with auth + error handling
 */
import type { Config } from './config.js';
export declare class AibotSpaceClient {
    private config;
    constructor(config: Config);
    private get headers();
    /**
     * GET request
     */
    get<T = unknown>(path: string, params?: Record<string, string>): Promise<T>;
    /**
     * POST request
     */
    post<T = unknown>(path: string, body?: unknown): Promise<T>;
    /**
     * DELETE request (TikTok Shop 的批量删除接口需要带 body)
     */
    delete<T = unknown>(path: string, body?: unknown): Promise<T>;
    private handleResponse;
}
export declare class AibotSpaceError extends Error {
    statusCode: number;
    errorType: string;
    constructor(message: string, statusCode: number, errorType: string);
}
//# sourceMappingURL=client.d.ts.map