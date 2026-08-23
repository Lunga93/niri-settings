import { z } from "zod";

export const WallpaperSettingsSchema = z.object({
  frequency: z.string().default("daily"),
  skip_today: z.boolean().default(false),
  sources_enabled: z.record(z.boolean()).default({
    local: true,
    unsplash: true,
    wallhaven: true,
    pexels: true,
    bing: true,
    picsum: true,
  }),
  sources_order: z
    .array(z.string())
    .default(["local", "unsplash", "wallhaven", "pexels", "bing", "picsum"]),
  unsplash_api_key: z.string().default(""),
  wallhaven_api_key: z.string().default(""),
  pexels_api_key: z.string().default(""),
  recent: z.array(z.string()).default([]),
  favorites: z.array(z.string()).default([]),
  library_dir: z.string().default(""),
  selected_mood: z.string().nullable().default(null),
  custom_subreddits: z.array(z.string()).default([]),
});
export const AppearanceSettingsSchema = z.object({
  color_scheme: z.enum(["dark", "light"]).default("dark"),
  accent_mode: z.enum(["dynamic", "manual"]).default("dynamic"),
  manual_primary: z.string().nullable().default(null),
  manual_secondary: z.string().nullable().default(null),
});
export const TopBarSettingsSchema = z.object({
  background_opacity: z.number().min(0).max(1).default(0.55),
  text_glow: z.number().min(0).max(1).default(0),
  font_family: z.string().default(""),
  font_weight: z.string().default("medium"),
});
export const DisplaySettingsSchema = z.object({
  scale: z.string().default("1.0"),
  night_light_enabled: z.boolean().default(false),
  night_light_temperature: z.number().min(1500).max(6500).default(4000),
});
export const IconsSettingsSchema = z.object({
  icon_theme: z.string().default("Papirus"),
  cursor_theme: z.string().default("Capitaine"),
  cursor_size: z.number().default(24),
});
export const SoundSettingsSchema = z.object({
  output_volume: z.number().min(0).max(100).default(100),
  output_muted: z.boolean().default(false),
  input_volume: z.number().min(0).max(100).default(100),
  input_muted: z.boolean().default(false),
  alert_sounds_enabled: z.boolean().default(true),
});
export const SettingsDataSchema = z.object({
  wallpaper: WallpaperSettingsSchema.default({}),
  appearance: AppearanceSettingsSchema.default({}),
  top_bar: TopBarSettingsSchema.default({}),
  display: DisplaySettingsSchema.default({}),
  icons: IconsSettingsSchema.default({}),
  sound: SoundSettingsSchema.default({}),
});

export type WallpaperSettings = z.infer<typeof WallpaperSettingsSchema>;

export type AppearanceSettings = z.infer<typeof AppearanceSettingsSchema>;

export type TopBarSettings = z.infer<typeof TopBarSettingsSchema>;

export type DisplaySettings = z.infer<typeof DisplaySettingsSchema>;

export type IconsSettings = z.infer<typeof IconsSettingsSchema>;

export type SoundSettings = z.infer<typeof SoundSettingsSchema>;

export type SettingsData = z.infer<typeof SettingsDataSchema>;

// Parse helper with error handling.
export const parseSettings = (raw: unknown): SettingsData | null => {
  const result = SettingsDataSchema.safeParse(raw);
  if (result.success) {
    return result.data;
  }
  console.warn("Settings parse failed:", result.error.flatten());
  return null;
};
