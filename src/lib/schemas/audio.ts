import { z } from "zod";

export const AudioDeviceSchema = z.object({
  id: z.number(),
  name: z.string(),
  is_default: z.boolean().default(false),
  volume: z.number().default(100),
  muted: z.boolean().default(false),
  device_type: z.string().default("sink"),
});

export type AudioDevice = z.infer<typeof AudioDeviceSchema>;

export const AudioInfoSchema = z.object({
  sinks: z.array(AudioDeviceSchema).default([]),
  sources: z.array(AudioDeviceSchema).default([]),
  default_sink_id: z.number().nullable().default(null),
  default_source_id: z.number().nullable().default(null),
});

export type AudioInfo = z.infer<typeof AudioInfoSchema>;
