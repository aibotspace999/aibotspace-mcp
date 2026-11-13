/**
 * Zod to JSON Schema converter (simplified, covers all our use cases)
 *
 * The MCP protocol requires JSON Schema for tool input definitions.
 * This converts Zod schemas to JSON Schema format.
 */
import { z } from 'zod';
export function zodToJsonSchema(schema) {
    return convertZodType(schema);
}
function convertZodType(schema) {
    // Handle ZodOptional, ZodDefault, etc. by unwrapping
    if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
        return convertZodType(schema._def.innerType);
    }
    if (schema instanceof z.ZodDefault) {
        const inner = convertZodType(schema._def.innerType);
        inner.default = schema._def.defaultValue();
        return inner;
    }
    if (schema instanceof z.ZodObject) {
        const properties = {};
        const required = [];
        const shape = schema._def.shape();
        for (const [key, value] of Object.entries(shape)) {
            properties[key] = convertZodType(value);
            if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodDefault)) {
                required.push(key);
            }
        }
        const result = { type: 'object', properties };
        if (required.length > 0)
            result.required = required;
        return result;
    }
    if (schema instanceof z.ZodString) {
        const result = { type: 'string' };
        // Check for URL format
        const checks = schema._def.checks || [];
        for (const check of checks) {
            if (check.kind === 'url')
                result.format = 'uri';
        }
        return result;
    }
    if (schema instanceof z.ZodNumber) {
        const result = { type: 'number' };
        const checks = schema._def.checks || [];
        for (const check of checks) {
            if (check.kind === 'int')
                result.type = 'integer';
            if (check.kind === 'min')
                result.minimum = check.value;
            if (check.kind === 'max')
                result.maximum = check.value;
        }
        return result;
    }
    if (schema instanceof z.ZodBoolean) {
        return { type: 'boolean' };
    }
    if (schema instanceof z.ZodArray) {
        return {
            type: 'array',
            items: convertZodType(schema._def.type),
        };
    }
    if (schema instanceof z.ZodEnum) {
        return {
            type: 'string',
            enum: schema._def.values,
        };
    }
    if (schema instanceof z.ZodUnion) {
        const options = schema._def.options;
        return {
            oneOf: options.map((o) => convertZodType(o)),
        };
    }
    if (schema instanceof z.ZodLiteral) {
        const value = schema._def.value;
        return { type: typeof value, const: value };
    }
    if (schema instanceof z.ZodEffects) {
        // For transforms/effects, use the input schema
        return convertZodType(schema._def.schema);
    }
    // Fallback
    return { type: 'string' };
}
//# sourceMappingURL=zodCompatible.js.map