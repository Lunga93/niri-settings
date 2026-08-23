import { z } from "zod";

export const DesktopAppSchema = z.object({
  id: z.string(),
  name: z.string(),
  exec: z.string(),
  icon: z.string(),
  comment: z.string(),
  mime_types: z.array(z.string()),
});
export type DesktopApp = z.infer<typeof DesktopAppSchema>;

export const InstalledAppsPayloadSchema = z.object({
  apps: z.array(DesktopAppSchema),
});

export const DefaultGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  mimes: z.array(z.string()),
  current: z.string(),
  candidates: z.array(DesktopAppSchema),
});
export type DefaultGroup = z.infer<typeof DefaultGroupSchema>;

export const DefaultAppsPayloadSchema = z.object({
  groups: z.array(DefaultGroupSchema),
});

export const SetDefaultResponseSchema = z.object({
  status: z.literal("ok"),
});
