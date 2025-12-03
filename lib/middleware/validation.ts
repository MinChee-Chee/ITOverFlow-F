import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Request validation middleware
 */
export function validateRequest<T extends z.ZodTypeAny>(
  schema: T,
  getData: (req: NextRequest) => Promise<unknown>
) {
  return async (req: NextRequest): Promise<{ data: z.infer<T> } | NextResponse> => {
    try {
      const rawData = await getData(req);
      const data = schema.parse(rawData);
      return { data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map(err => ({
              path: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }
  };
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return sanitizeString(obj) as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as T;
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Validate and sanitize request body
 */
export async function validateAndSanitizeBody<T extends z.ZodTypeAny>(
  req: NextRequest,
  schema: T
): Promise<{ data: z.infer<T> } | NextResponse> {
  try {
    const body = await req.json();
    const sanitized = sanitizeObject(body);
    const data = schema.parse(sanitized);
    return { data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  id: z.string().min(1).regex(/^[a-f\d]{24}$/i, 'Invalid ID format'),
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
  }),
  searchQuery: z.string().min(1).max(200),
};


