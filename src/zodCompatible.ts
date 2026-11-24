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

export function zodToJsonSchema(schema: z.ZodType): any {
  return convertZodType(schema);
}

/** Read the description attached by `.describe()` (lives on _def.description). */
function readDescription(schema: z.ZodType): string | undefined {
  const anySchema = schema as any;
  const fromGetter = typeof anySchema.description === 'string' ? anySchema.description : undefined;
  const fromDef = typeof anySchema._def?.description === 'string' ? anySchema._def.description : undefined;
  const text = fromGetter || fromDef;
  return text && text.trim() ? text.trim() : undefined;
}

/** Attach a description to an already-converted node. */
function withDescription(node: any, schema: z.ZodType): any {
  const text = readDescription(schema);
  if (text) node.description = text;
  return node;
}

function convertZodType(schema: z.ZodType): any {
  // Handle ZodOptional, ZodDefault, etc. by unwrapping
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return withDescription(convertZodType((schema as any)._def.innerType), schema);
  }

  if (schema instanceof z.ZodDefault) {
    const inner = convertZodType((schema as any)._def.innerType);
    const dv = (schema as any)._def.defaultValue;
    if (typeof dv === 'function') {
      try {
        inner.default = dv();
      } catch {
        /* default is not representable in JSON Schema; skip it */
      }
    }
    return withDescription(inner, schema);
  }

  if (schema instanceof z.ZodObject) {
    const properties: Record<string, any> = {};
    const required: string[] = [];
    const shape = (schema as any)._def.shape();

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = convertZodType(value as z.ZodType);
      if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodDefault)) {
        required.push(key);
      }
    }

    const result: any = { type: 'object', properties };
    if (required.length > 0) result.required = required;
    return withDescription(result, schema);
  }

  if (schema instanceof z.ZodString) {
    const result: any = { type: 'string' };
    // Check for URL format
    const checks = (schema as any)._def.checks || [];
    for (const check of checks) {
      if (check.kind === 'url') result.format = 'uri';
    }
    return withDescription(result, schema);
  }

  if (schema instanceof z.ZodNumber) {
    const result: any = { type: 'number' };
    const checks = (schema as any)._def.checks || [];
    for (const check of checks) {
      if (check.kind === 'int') result.type = 'integer';
      if (check.kind === 'min') result.minimum = check.value;
      if (check.kind === 'max') result.maximum = check.value;
    }
    return withDescription(result, schema);
  }

  if (schema instanceof z.ZodBoolean) {
    return withDescription({ type: 'boolean' }, schema);
  }

  if (schema instanceof z.ZodArray) {
    return withDescription(
      {
        type: 'array',
        items: convertZodType((schema as any)._def.type),
      },
      schema,
    );
  }

  if (schema instanceof z.ZodEnum) {
    return withDescription(
      {
        type: 'string',
        enum: (schema as any)._def.values,
      },
      schema,
    );
  }

  if (schema instanceof z.ZodUnion) {
    const options = (schema as any)._def.options;
    return withDescription(
      {
        oneOf: options.map((o: z.ZodType) => convertZodType(o)),
      },
      schema,
    );
  }

  if (schema instanceof z.ZodLiteral) {
    const value = (schema as any)._def.value;
    return withDescription({ type: typeof value, const: value }, schema);
  }

  if (schema instanceof z.ZodEffects) {
    // For transforms/effects, use the input schema
    return withDescription(convertZodType((schema as any)._def.schema), schema);
  }

  // Fallback
  return withDescription({ type: 'string' }, schema);
}
