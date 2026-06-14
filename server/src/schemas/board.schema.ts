import { z } from 'zod';

export const createBoardSchema = z.object({
  name: z.string().min(1).max(255),
  position: z.number().int().min(0).optional(),
});

export const updateBoardSchema = createBoardSchema.partial();

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
