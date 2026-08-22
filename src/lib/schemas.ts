import { z } from "zod";

// ── Go sidecar error schema ──
export const AppErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export type AppError = z.infer<typeof AppErrorSchema>;

// ── Settings schemas ──
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

// ── Display output schema (from sidecar) ──
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

// ── Audio schemas (from sidecar) ──
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

// ── Pywal Theme schema (from sidecar) ──
export const PywalThemeSchema = z.object({
  wallpaper: z.string().default(""),
  alpha: z.string().default("100"),
  scheme: z.string().default("dark"),
  special: z
    .object({
      background: z.string().default("#12100e"),
      foreground: z.string().default("#dfe4e9"),
      cursor: z.string().default("#dfe4e9"),
    })
    .default({}),
  colors: z.record(z.string()).default({}),
  primary_accent: z.string().default("#0a84ff"),
  secondary_accent: z.string().default("#bf5af2"),
});

export type PywalTheme = z.infer<typeof PywalThemeSchema>;

// ── Keybinding schema (from sidecar) ──
export const KeybindingSchema = z.object({
  action: z.string(),
  key: z.string(),
});

export type Keybinding = z.infer<typeof KeybindingSchema>;

// ── Wallpaper info schema (from sidecar) ──
export const WallpaperInfoSchema = z.object({
  current_wallpaper: z.string().default(""),
  image_base64: z.string().default(""),
  total_scanned: z.number().default(0),
  mood_counts: z.record(z.number()).default({}),
  wallpapers_by_mood: z.record(z.array(z.string())).default({}),
  skip_today: z.boolean().default(false),
});

export type WallpaperInfo = z.infer<typeof WallpaperInfoSchema>;

// ── Parse helpers with error handling ──
export const parseSettings = (raw: unknown): SettingsData | null => {
  const result = SettingsDataSchema.safeParse(raw);
  if (result.success) {
    return result.data;
  }
  console.warn("Settings parse failed:", result.error.flatten());
  return null;
};

export const parseDisplayOutputs = (raw: unknown): DisplayOutput[] | null => {
  const result = z.array(DisplayOutputSchema).safeParse(raw);
  if (result.success) {
    return result.data;
  }
  console.warn("Display outputs parse failed:", result.error.flatten());
  return null;
};
