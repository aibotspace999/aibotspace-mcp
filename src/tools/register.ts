/**
 * Tool registration - defines the interface each tool group must implement
 */

import { z } from 'zod';
import type { AibotSpaceClient } from '../client.js';
import type { Config } from '../config.js';

/**
 * Schema for an MCP tool parameter (subset of JSON Schema + Zod)
 */
export interface ToolParam {
  name: string;
  description: string;
  zodSchema: z.ZodType;
  required?: boolean;
}

/**
 * A single MCP tool definition
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodObject<any>;
  /** Group tag for filtering */
  group: string;
  /** The handler function */
  handler: (params: any, client: AibotSpaceClient, config: Config) => Promise<string>;
}

/**
 * A tool group that registers multiple tools
 */
export interface ToolGroupModule {
  group: string;
  label: string;
  register(): ToolDefinition[];
}
