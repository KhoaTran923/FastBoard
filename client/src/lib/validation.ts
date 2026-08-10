import { z } from 'zod';

// Client-side Zod schemas mirroring the server's rules

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(2, 'Please enter your name').max(255),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

export const taskFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(500, 'Title is too long'),
  description: z.string().trim().max(5000, 'Description is too long').optional(),
});

/** First validation message for `data`, or null when it passes. */
export function firstIssue(schema: z.ZodTypeAny, data: unknown): string | null {
  const result = schema.safeParse(data);
  return result.success ? null : (result.error.errors[0]?.message ?? 'Invalid input');
}
