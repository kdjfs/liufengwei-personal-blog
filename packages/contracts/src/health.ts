import { z } from 'zod';

export const healthComponentSchema = z.enum(['up', 'down']);

export const liveHealthSchema = z.object({
  status: z.literal('ok'),
  requestId: z.string().min(1),
});

export const readyHealthSchema = z.object({
  status: z.enum(['ready', 'not_ready']),
  requestId: z.string().min(1),
  components: z.object({
    mysql: healthComponentSchema,
    redis: healthComponentSchema,
  }),
});

export type LiveHealth = z.infer<typeof liveHealthSchema>;
export type ReadyHealth = z.infer<typeof readyHealthSchema>;
