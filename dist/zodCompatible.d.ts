/**
 * Zod to JSON Schema converter (simplified, covers all our use cases)
 *
 * The MCP protocol requires JSON Schema for tool input definitions.
 * This converts Zod schemas to JSON Schema format.
 */
import { z } from 'zod';
export declare function zodToJsonSchema(schema: z.ZodType): any;
//# sourceMappingURL=zodCompatible.d.ts.map