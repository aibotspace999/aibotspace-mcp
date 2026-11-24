/**
 * AIBotSpace HTTP Client - thin wrapper around fetch with auth + error handling
 */
export class AibotSpaceClient {
    config;
    constructor(config) {
        this.config = config;
    }
    get headers() {
        return {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'aibotspace-mcp/1.0',
        };
    }
    /**
     * GET request
     */
    async get(path, params) {
        let url = `${this.config.baseUrl}${path}`;
        if (params) {
            const qs = new URLSearchParams(params).toString();
            url += `?${qs}`;
        }
        const res = await fetch(url, { method: 'GET', headers: this.headers });
        return this.handleResponse(res);
    }
    /**
     * POST request
     */
    async post(path, body) {
        const res = await fetch(`${this.config.baseUrl}${path}`, {
            method: 'POST',
            headers: this.headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        return this.handleResponse(res);
    }
    /**
     * DELETE request (TikTok Shop 的批量删除接口需要带 body)
     */
    async delete(path, body) {
        const res = await fetch(`${this.config.baseUrl}${path}`, {
            method: 'DELETE',
            headers: this.headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        return this.handleResponse(res);
    }
    async handleResponse(res) {
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        }
        catch {
            data = text;
        }
        if (!res.ok) {
            const error = data && typeof data === 'object' ? data : { message: text };
            throw new AibotSpaceError(error.message || error.error?.message || `HTTP ${res.status}`, res.status, error.type || error.error?.type || 'api_error');
        }
        return data;
    }
}
export class AibotSpaceError extends Error {
    statusCode;
    errorType;
    constructor(message, statusCode, errorType) {
        super(message);
        this.statusCode = statusCode;
        this.errorType = errorType;
        this.name = 'AibotSpaceError';
    }
}
//# sourceMappingURL=client.js.map