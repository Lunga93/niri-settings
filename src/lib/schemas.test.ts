import { describe, it, expect } from "vitest";
import {
  SettingsDataSchema,
  WallpaperSettingsSchema,
  AppearanceSettingsSchema,
  TopBarSettingsSchema,
  DisplaySettingsSchema,
  IconsSettingsSchema,
  SoundSettingsSchema,
  DisplayOutputSchema,
  KeybindingSchema,
  WallpaperInfoSchema,
  AppErrorSchema,
  parseSettings,
  parseDisplayOutputs,
} from "./schemas";

// ── SettingsDataSchema ──

describe("SettingsDataSchema", () => {
  it("parses empty object with all defaults", () => {
    const result = SettingsDataSchema.parse({});
    expect(result.wallpaper.frequency).toBe("daily");
    expect(result.wallpaper.skip_today).toBe(false);
    expect(result.wallpaper.selected_mood).toBeNull();
    expect(result.appearance.color_scheme).toBe("dark");
    expect(result.appearance.accent_mode).toBe("dynamic");
    expect(result.appearance.manual_primary).toBeNull();
    expect(result.top_bar.background_opacity).toBe(0.55);
    expect(result.top_bar.text_glow).toBe(0);
    expect(result.display.scale).toBe("1.0");
    expect(result.display.night_light_enabled).toBe(false);
    expect(result.display.night_light_temperature).toBe(4000);
    expect(result.icons.icon_theme).toBe("Papirus");
    expect(result.icons.cursor_theme).toBe("Capitaine");
    expect(result.icons.cursor_size).toBe(24);
    expect(result.sound.output_volume).toBe(100);
    expect(result.sound.output_muted).toBe(false);
    expect(result.sound.input_volume).toBe(100);
    expect(result.sound.input_muted).toBe(false);
    expect(result.sound.alert_sounds_enabled).toBe(true);
  });

  it("parses fully populated settings", () => {
    const data = {
      wallpaper: {
        frequency: "hourly",
        skip_today: true,
        sources_enabled: { local: true, unsplash: false },
        sources_order: ["unsplash", "local"],
        unsplash_api_key: "test-key",
        wallhaven_api_key: "",
        pexels_api_key: "",
        recent: ["/path/to/recent.jpg"],
        favorites: ["/path/to/fav.jpg"],
        library_dir: "/ wallpapers",
        selected_mood: "sunset",
      },
      appearance: {
        color_scheme: "light",
        accent_mode: "manual",
        manual_primary: "#ff375f",
        manual_secondary: "#0a84ff",
      },
      top_bar: {
        background_opacity: 0.8,
        text_glow: 0.5,
        font_family: "SF Pro",
        font_weight: "bold",
      },
      display: {
        scale: "1.5",
        night_light_enabled: true,
        night_light_temperature: 3500,
      },
      icons: {
        icon_theme: "Tela",
        cursor_theme: "Breeze",
        cursor_size: 32,
      },
      sound: {
        output_volume: 75,
        output_muted: true,
        input_volume: 50,
        input_muted: false,
        alert_sounds_enabled: false,
      },
    };

    const result = SettingsDataSchema.parse(data);
    expect(result.wallpaper.frequency).toBe("hourly");
    expect(result.wallpaper.selected_mood).toBe("sunset");
    expect(result.appearance.color_scheme).toBe("light");
    expect(result.appearance.manual_primary).toBe("#ff375f");
    expect(result.top_bar.background_opacity).toBe(0.8);
    expect(result.display.scale).toBe("1.5");
    expect(result.display.night_light_temperature).toBe(3500);
    expect(result.icons.icon_theme).toBe("Tela");
    expect(result.sound.output_muted).toBe(true);
  });

  it("rejects invalid color_scheme", () => {
    const result = SettingsDataSchema.safeParse({
      appearance: { color_scheme: "blue" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects background_opacity out of range", () => {
    const result = SettingsDataSchema.safeParse({
      top_bar: { background_opacity: 1.5 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative background_opacity", () => {
    const result = SettingsDataSchema.safeParse({
      top_bar: { background_opacity: -0.1 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects night_light_temperature below minimum", () => {
    const result = SettingsDataSchema.safeParse({
      display: { night_light_temperature: 500 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects night_light_temperature above maximum", () => {
    const result = SettingsDataSchema.safeParse({
      display: { night_light_temperature: 10000 },
    });
    expect(result.success).toBe(false);
  });

  it("accepts night_light_temperature at boundaries", () => {
    const min = SettingsDataSchema.safeParse({
      wallpaper: {},
      appearance: {},
      top_bar: {},
      display: { night_light_temperature: 1500 },
      icons: {},
      sound: {},
    });
    expect(min.success).toBe(true);

    const max = SettingsDataSchema.safeParse({
      wallpaper: {},
      appearance: {},
      top_bar: {},
      display: { night_light_temperature: 6500 },
      icons: {},
      sound: {},
    });
    expect(max.success).toBe(true);
  });

  it("rejects output_volume above 100", () => {
    const result = SettingsDataSchema.safeParse({
      sound: { output_volume: 150 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects output_volume below 0", () => {
    const result = SettingsDataSchema.safeParse({
      sound: { output_volume: -1 },
    });
    expect(result.success).toBe(false);
  });

  it("accepts output_volume at boundaries", () => {
    const min = SettingsDataSchema.safeParse({
      wallpaper: {},
      appearance: {},
      top_bar: {},
      display: {},
      icons: {},
      sound: { output_volume: 0 },
    });
    expect(min.success).toBe(true);

    const max = SettingsDataSchema.safeParse({
      wallpaper: {},
      appearance: {},
      top_bar: {},
      display: {},
      icons: {},
      sound: { output_volume: 100 },
    });
    expect(max.success).toBe(true);
  });
});

// ── WallpaperSettingsSchema ──

describe("WallpaperSettingsSchema", () => {
  it("applies defaults for empty input", () => {
    const result = WallpaperSettingsSchema.parse({});
    expect(result.frequency).toBe("daily");
    expect(result.sources_enabled).toEqual({
      local: true,
      unsplash: true,
      wallhaven: true,
      pexels: true,
      bing: true,
      picsum: true,
    });
    expect(result.sources_order).toEqual([
      "local",
      "unsplash",
      "wallhaven",
      "pexels",
      "bing",
      "picsum",
    ]);
    expect(result.recent).toEqual([]);
    expect(result.favorites).toEqual([]);
  });

  it("accepts all frequency values", () => {
    for (const freq of ["daily", "hourly", "startup", "never"]) {
      const result = WallpaperSettingsSchema.parse({ frequency: freq });
      expect(result.frequency).toBe(freq);
    }
  });

  it("accepts null selected_mood", () => {
    const result = WallpaperSettingsSchema.parse({ selected_mood: null });
    expect(result.selected_mood).toBeNull();
  });

  it("accepts string selected_mood", () => {
    const result = WallpaperSettingsSchema.parse({ selected_mood: "ocean" });
    expect(result.selected_mood).toBe("ocean");
  });
});

// ── AppearanceSettingsSchema ──

describe("AppearanceSettingsSchema", () => {
  it("accepts dark and light color schemes", () => {
    expect(AppearanceSettingsSchema.parse({ color_scheme: "dark" }).color_scheme).toBe("dark");
    expect(AppearanceSettingsSchema.parse({ color_scheme: "light" }).color_scheme).toBe("light");
  });

  it("rejects invalid color scheme", () => {
    expect(AppearanceSettingsSchema.safeParse({ color_scheme: "auto" }).success).toBe(false);
  });

  it("accepts dynamic and manual accent modes", () => {
    expect(AppearanceSettingsSchema.parse({ accent_mode: "dynamic" }).accent_mode).toBe("dynamic");
    expect(AppearanceSettingsSchema.parse({ accent_mode: "manual" }).accent_mode).toBe("manual");
  });

  it("rejects invalid accent mode", () => {
    expect(AppearanceSettingsSchema.safeParse({ accent_mode: "custom" }).success).toBe(false);
  });
});

// ── TopBarSettingsSchema ──

describe("TopBarSettingsSchema", () => {
  it("enforces opacity range 0-1", () => {
    expect(TopBarSettingsSchema.safeParse({ background_opacity: 0 }).success).toBe(true);
    expect(TopBarSettingsSchema.safeParse({ background_opacity: 1 }).success).toBe(true);
    expect(TopBarSettingsSchema.safeParse({ background_opacity: -0.1 }).success).toBe(false);
    expect(TopBarSettingsSchema.safeParse({ background_opacity: 1.1 }).success).toBe(false);
  });

  it("enforces text_glow range 0-1", () => {
    expect(TopBarSettingsSchema.safeParse({ text_glow: 0 }).success).toBe(true);
    expect(TopBarSettingsSchema.safeParse({ text_glow: 1 }).success).toBe(true);
    expect(TopBarSettingsSchema.safeParse({ text_glow: 2 }).success).toBe(false);
  });
});

// ── DisplaySettingsSchema ──

describe("DisplaySettingsSchema", () => {
  it("defaults scale to 1.0", () => {
    expect(DisplaySettingsSchema.parse({}).scale).toBe("1.0");
  });

  it("accepts any string for scale", () => {
    expect(DisplaySettingsSchema.parse({ scale: "0.8" }).scale).toBe("0.8");
    expect(DisplaySettingsSchema.parse({ scale: "2.0" }).scale).toBe("2.0");
  });
});

// ── IconsSettingsSchema ──

describe("IconsSettingsSchema", () => {
  it("defaults to Papirus icon theme", () => {
    expect(IconsSettingsSchema.parse({}).icon_theme).toBe("Papirus");
  });

  it("defaults cursor_size to 24", () => {
    expect(IconsSettingsSchema.parse({}).cursor_size).toBe(24);
  });
});

// ── SoundSettingsSchema ──

describe("SoundSettingsSchema", () => {
  it("enforces volume range 0-100", () => {
    expect(SoundSettingsSchema.parse({ output_volume: 0 }).output_volume).toBe(0);
    expect(SoundSettingsSchema.parse({ output_volume: 100 }).output_volume).toBe(100);
    expect(SoundSettingsSchema.safeParse({ output_volume: -1 }).success).toBe(false);
    expect(SoundSettingsSchema.safeParse({ output_volume: 101 }).success).toBe(false);
  });

  it("defaults alert_sounds_enabled to true", () => {
    expect(SoundSettingsSchema.parse({}).alert_sounds_enabled).toBe(true);
  });
});

// ── DisplayOutputSchema ──

describe("DisplayOutputSchema", () => {
  it("parses a valid display output", () => {
    const output = DisplayOutputSchema.parse({
      name: "DP-1",
      enabled: true,
      width: 1920,
      height: 1080,
      refresh_hz: 60,
      scale: 1,
      x: 0,
      y: 0,
      focused: true,
    });
    expect(output.name).toBe("DP-1");
    expect(output.width).toBe(1920);
    expect(output.refresh_hz).toBe(60);
    expect(output.focused).toBe(true);
  });

  it("rejects missing required fields", () => {
    expect(DisplayOutputSchema.safeParse({ name: "DP-1" }).success).toBe(false);
    expect(DisplayOutputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects non-boolean focused", () => {
    expect(
      DisplayOutputSchema.safeParse({
        name: "DP-1",
        enabled: true,
        width: 1920,
        height: 1080,
        refresh_hz: 60,
        scale: 1,
        x: 0,
        y: 0,
        focused: "yes",
      }).success,
    ).toBe(false);
  });
});

// ── KeybindingSchema ──

describe("KeybindingSchema", () => {
  it("parses a valid keybinding", () => {
    const kb = KeybindingSchema.parse({ action: "close-window", key: "MOD+Q" });
    expect(kb.action).toBe("close-window");
    expect(kb.key).toBe("MOD+Q");
  });

  it("rejects missing action", () => {
    expect(KeybindingSchema.safeParse({ key: "MOD+Q" }).success).toBe(false);
  });

  it("rejects missing key", () => {
    expect(KeybindingSchema.safeParse({ action: "close-window" }).success).toBe(false);
  });
});

// ── WallpaperInfoSchema ──

describe("WallpaperInfoSchema", () => {
  it("parses empty object with defaults", () => {
    const info = WallpaperInfoSchema.parse({});
    expect(info.current_wallpaper).toBe("");
    expect(info.image_base64).toBe("");
    expect(info.total_scanned).toBe(0);
    expect(info.mood_counts).toEqual({});
    expect(info.wallpapers_by_mood).toEqual({});
    expect(info.skip_today).toBe(false);
  });

  it("parses populated wallpaper info", () => {
    const info = WallpaperInfoSchema.parse({
      current_wallpaper: "/home/user/Pictures/wallpapers/daily.jpg",
      image_base64: "data:image/jpeg;base64,123",
      total_scanned: 50,
      mood_counts: { dark: 20, light: 10 },
      wallpapers_by_mood: { dark: ["/path1"] },
      skip_today: true,
    });
    expect(info.current_wallpaper).toBe("/home/user/Pictures/wallpapers/daily.jpg");
    expect(info.total_scanned).toBe(50);
    expect(info.mood_counts.dark).toBe(20);
    expect(info.skip_today).toBe(true);
  });
});

// ── AppErrorSchema ──

describe("AppErrorSchema", () => {
  it("parses a valid error", () => {
    const err = AppErrorSchema.parse({
      code: "NIRI_IPC_FAILED",
      message: "niri msg outputs failed",
    });
    expect(err.code).toBe("NIRI_IPC_FAILED");
    expect(err.details).toBeUndefined();
  });

  it("accepts optional details", () => {
    const err = AppErrorSchema.parse({
      code: "PARSE_ERROR",
      message: "bad json",
      details: { raw: "not json" },
    });
    expect(err.details).toEqual({ raw: "not json" });
  });
});

// ── parseSettings helper ──

describe("parseSettings", () => {
  it("returns parsed data for valid input", () => {
    const result = parseSettings({});
    expect(result).not.toBeNull();
    expect(result?.wallpaper.frequency).toBe("daily");
  });

  it("returns null for invalid input", () => {
    const result = parseSettings({ appearance: { color_scheme: "neon" } });
    expect(result).toBeNull();
  });

  it("returns null for completely wrong type", () => {
    const result = parseSettings("not an object");
    expect(result).toBeNull();
  });

  it("returns null for null input", () => {
    const result = parseSettings(null);
    expect(result).toBeNull();
  });
});

// ── parseDisplayOutputs helper ──

describe("parseDisplayOutputs", () => {
  it("parses an array of display outputs", () => {
    const outputs = parseDisplayOutputs([
      {
        name: "DP-1",
        enabled: true,
        width: 1920,
        height: 1080,
        refresh_hz: 60,
        scale: 1,
        x: 0,
        y: 0,
        focused: false,
      },
    ]);
    expect(outputs).toHaveLength(1);
    expect(outputs?.[0].name).toBe("DP-1");
  });

  it("parses an empty array", () => {
    expect(parseDisplayOutputs([])).toEqual([]);
  });

  it("returns null for invalid data", () => {
    expect(parseDisplayOutputs([{ name: "DP-1" }])).toBeNull();
  });

  it("returns null for non-array", () => {
    expect(parseDisplayOutputs("not an array")).toBeNull();
  });

  it("returns null if any element is invalid", () => {
    expect(
      parseDisplayOutputs([
        {
          name: "DP-1",
          enabled: true,
          width: 1920,
          height: 1080,
          refresh_hz: 60,
          scale: 1,
          x: 0,
          y: 0,
          focused: false,
        },
        { name: "HDMI-1" }, // missing required fields
      ]),
    ).toBeNull();
  });
});
