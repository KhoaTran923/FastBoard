import { z } from 'zod';

export const boardNameSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
});

export const columnNameSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
});
