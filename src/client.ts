/**
 * AIBotSpace HTTP Client - thin wrapper around fetch with auth + error handling
 */

import type { Config } from './config.js';

export class AibotSpaceClient {
  constructor(private config: Config) {}

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'aibotspace-mcp/1.0',
    };
  }

  /**
   * GET request
   */
  async get<T = unknown>(path: string, params?: Record<string, string>): Promise<T> {
    let url = `${this.config.baseUrl}${path}`;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      url += `?${qs}`;
    }

    const res = await fetch(url, { method: 'GET', headers: this.headers });
    return this.handleResponse<T>(res);
  }

  /**
   * POST request
   */
  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(res);
  }

  /**
   * DELETE request (TikTok Shop 的批量删除接口需要带 body)
   */
  async delete<T = unknown>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(res);
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!res.ok) {
      const error: any = data && typeof data === 'object' ? data : { message: text };
      throw new AibotSpaceError(
        error.message || error.error?.message || `HTTP ${res.status}`,
        res.status,
        error.type || error.error?.type || 'api_error',
      );
    }

    return data as T;
  }
}

export class AibotSpaceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType: string,
  ) {
    super(message);
    this.name = 'AibotSpaceError';
  }
}
