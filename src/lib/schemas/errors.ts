import { z } from "zod";

export const AppErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export type AppError = z.infer<typeof AppErrorSchema>;
