/**
 * Zod to JSON Schema converter (simplified, covers all our use cases)
 *
 * The MCP protocol requires JSON Schema for tool input definitions.
 * This converts Zod schemas to JSON Schema format.
 *
 * IMPORTANT: `.describe()` text must be preserved — it is the only channel
 * through which the model learns what a parameter means and what constraints
 * apply (required companions, enum semantics, safety confirmations). Dropping
 * it silently makes tools uncallable in practice.
 */
import { z } from 'zod';
export declare function zodToJsonSchema(schema: z.ZodType): any;
//# sourceMappingURL=zodCompatible.d.ts.map