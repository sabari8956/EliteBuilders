import { z } from "zod";

export const challengeCreateSchema = z.object({
  title: z.string().trim().min(3).max(120),
  brief: z.string().trim().min(20),
  rubric: z.record(z.string(), z.unknown()),
  deadline: z.iso.datetime({ offset: true }),
  prize: z.string().trim().max(120).optional(),
});

export const challengeUpdateSchema = challengeCreateSchema.partial();
