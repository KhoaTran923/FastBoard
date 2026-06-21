import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  due_date: z.string().date().optional(),
  assignee_id: z.string().uuid().optional(),
  position: z.number().int().min(0).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).nullable().optional(),
  due_date: z.string().date().nullable().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0).optional(),
  column_id: z.string().uuid().optional(),
});

export const moveTaskSchema = z.object({
  column_id: z.string().uuid(),
  position: z.number().int().min(0),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
