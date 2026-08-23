import { z } from "zod";

export const DisplayOutputSchema = z.object({
  name: z.string(),
  full_name: z.string().default(""),
  connector: z.string().default(""),
  enabled: z.boolean().default(true),
  width: z.number(),
  height: z.number(),
  refresh_hz: z.number(),
  scale: z.number().default(1),
  x: z.number().default(0),
  y: z.number().default(0),
  transform: z.string().default("normal"),
  current_mode: z.string().default(""),
  modes: z.array(z.string()).default([]),
  focused: z.boolean().default(false),
});

export type DisplayOutput = z.infer<typeof DisplayOutputSchema>;

export const DisplayLayoutConfigSchema = z.object({
  name: z.string(),
  full_name: z.string().default(""),
  connector: z.string().default(""),
  x: z.number(),
  y: z.number(),
  transform: z.string().default("normal"),
  scale: z.number().default(1),
  mode: z.string().default(""),
});

export type DisplayLayoutConfig = z.infer<typeof DisplayLayoutConfigSchema>;

export const parseDisplayOutputs = (raw: unknown): DisplayOutput[] | null => {
  const result = z.array(DisplayOutputSchema).safeParse(raw);
  if (result.success) {
    return result.data;
  }
  console.warn("Display outputs parse failed:", result.error.flatten());
  return null;
};
