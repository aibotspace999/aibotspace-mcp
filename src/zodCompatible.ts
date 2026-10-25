/**
 * Zod to JSON Schema converter (simplified, covers all our use cases)
 *
 * The MCP protocol requires JSON Schema for tool input definitions.
 * This converts Zod schemas to JSON Schema format.
 */

import { z } from 'zod';

export function zodToJsonSchema(schema: z.ZodType): any {
  return convertZodType(schema);
}

function convertZodType(schema: z.ZodType): any {
  // Handle ZodOptional, ZodDefault, etc. by unwrapping
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return convertZodType((schema as any)._def.innerType);
  }

  if (schema instanceof z.ZodDefault) {
    const inner = convertZodType((schema as any)._def.innerType);
    inner.default = (schema as any)._def.defaultValue();
    return inner;
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
    return result;
  }

  if (schema instanceof z.ZodString) {
    const result: any = { type: 'string' };
    // Check for URL format
    const checks = (schema as any)._def.checks || [];
    for (const check of checks) {
      if (check.kind === 'url') result.format = 'uri';
    }
    return result;
  }

  if (schema instanceof z.ZodNumber) {
    const result: any = { type: 'number' };
    const checks = (schema as any)._def.checks || [];
    for (const check of checks) {
      if (check.kind === 'int') result.type = 'integer';
      if (check.kind === 'min') result.minimum = check.value;
      if (check.kind === 'max') result.maximum = check.value;
    }
    return result;
  }

  if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  }

  if (schema instanceof z.ZodArray) {
    return {
      type: 'array',
      items: convertZodType((schema as any)._def.type),
    };
  }

  if (schema instanceof z.ZodEnum) {
    return {
      type: 'string',
      enum: (schema as any)._def.values,
    };
  }

  if (schema instanceof z.ZodUnion) {
    const options = (schema as any)._def.options;
    return {
      oneOf: options.map((o: z.ZodType) => convertZodType(o)),
    };
  }

  if (schema instanceof z.ZodLiteral) {
    const value = (schema as any)._def.value;
    return { type: typeof value, const: value };
  }

  if (schema instanceof z.ZodEffects) {
    // For transforms/effects, use the input schema
    return convertZodType((schema as any)._def.schema);
  }

  // Fallback
  return { type: 'string' };
}
