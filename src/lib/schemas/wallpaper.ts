import { z } from "zod";

// ── Wallpaper info schemas (from sidecar) ──
export const WallpaperItemSchema = z.object({
  path: z.string(),
  filename: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  name: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  moods: z
    .array(z.string())
    .nullish()
    .transform((v) => v ?? []),
  file_size: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
  mtime: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
  thumbnail: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
});

export type WallpaperItem = z.infer<typeof WallpaperItemSchema>;

export const WallpaperListSchema = z.object({
  wallpapers: z
    .array(WallpaperItemSchema)
    .nullish()
    .transform((v) => v ?? []),
  total: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
});

export type WallpaperList = z.infer<typeof WallpaperListSchema>;

export const WallpaperInfoSchema = z.object({
  current_wallpaper: z
    .string()
    .nullish()
    .transform((v) => v ?? ""),
  total_scanned: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
  mood_counts: z
    .record(z.number())
    .nullish()
    .transform((v) => v ?? {}),
  wallpapers_by_mood: z
    .record(z.array(z.string()))
    .nullish()
    .transform((v) => v ?? {}),
  wallpapers: z
    .array(WallpaperItemSchema)
    .nullish()
    .transform((v) => v ?? []),
  skip_today: z
    .boolean()
    .nullish()
    .transform((v) => v ?? false),
});

export type WallpaperInfo = z.infer<typeof WallpaperInfoSchema>;

export const WallpaperThumbsResultSchema = z.object({
  generated: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
  total: z
    .number()
    .nullish()
    .transform((v) => v ?? 0),
});

export type WallpaperThumbsResult = z.infer<typeof WallpaperThumbsResultSchema>;
