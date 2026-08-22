import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import {
  SettingsDataSchema,
  WallpaperInfoSchema,
  type SettingsData,
  type WallpaperInfo,
} from "@/lib/schemas";
import { writeSettings, readSettings, setGSetting, getWallpaperInfo } from "@/lib/services";
import { execScript } from "@/lib/sidecar";
import { logger, sidecarLogger } from "@/lib/logger";

// ── Default state from Zod schema ──
const DEFAULT_SETTINGS: SettingsData = SettingsDataSchema.parse({});

// ── Primitive atoms ──
export const settingsAtom = atomWithStorage<SettingsData>("niri-settings-data", DEFAULT_SETTINGS);

// ── Derived read atoms (per section) ──
export const wallpaperAtom = atom((get) => get(settingsAtom).wallpaper);
export const appearanceAtom = atom((get) => get(settingsAtom).appearance);
export const topBarAtom = atom((get) => get(settingsAtom).top_bar);
export const displayAtom = atom((get) => get(settingsAtom).display);
export const iconsAtom = atom((get) => get(settingsAtom).icons);
export const soundAtom = atom((get) => get(settingsAtom).sound);

// ── Write atoms with embedded side effects ──

/**
 * Write to any settings field. Persists to disk and triggers side effects.
 */
export const setSettingsFieldAtom = atom(
  null,
  (get, set, update: { section: keyof SettingsData; key: string; value: unknown }) => {
    const prev = get(settingsAtom);
    const sectionData = prev[update.section];
    const next = {
      ...prev,
      [update.section]: {
        ...sectionData,
        [update.key]: update.value,
      },
    };

    set(settingsAtom, next);

    // Persist to disk (fire-and-forget)
    writeSettings(next).catch((err) => {
      sidecarLogger.error("Failed to persist settings", err);
    });

    // Trigger section-specific side effects
    triggerSideEffects(update.section, next);
  },
);

/**
 * Replace an entire settings section.
 */
export const setSettingsSectionAtom = atom(
  null,
  (
    get,
    set,
    update: { section: keyof SettingsData; partial: Partial<SettingsData[keyof SettingsData]> },
  ) => {
    const prev = get(settingsAtom);
    const next = {
      ...prev,
      [update.section]: {
        ...prev[update.section],
        ...update.partial,
      },
    };

    set(settingsAtom, next);

    writeSettings(next).catch((err) => {
      sidecarLogger.error("Failed to persist settings", err);
    });

    triggerSideEffects(update.section, next);
  },
);

/**
 * Load settings from disk into the atom.
 */
export const loadSettingsAtom = atom(null, async (_get, set) => {
  logger.info("Loading settings from disk");
  const data = await readSettings();
  if (data) {
    set(settingsAtom, data);
    logger.info("Settings loaded from disk");
  }
});

// ── Appearance-specific write atoms (multi-field updates) ──

export const setColorSchemeAtom = atom(null, (get, set, scheme: "dark" | "light") => {
  const prev = get(settingsAtom);
  const next = {
    ...prev,
    appearance: { ...prev.appearance, color_scheme: scheme },
  };
  set(settingsAtom, next);
  writeSettings(next).catch(() => undefined);
  triggerSideEffects("appearance", next);
});

export const setAccentColorAtom = atom(null, (get, set, color: string) => {
  const prev = get(settingsAtom);
  const next = {
    ...prev,
    appearance: {
      ...prev.appearance,
      accent_mode: "manual" as const,
      manual_primary: color,
    },
  };
  set(settingsAtom, next);
  writeSettings(next).catch(() => undefined);
  triggerSideEffects("appearance", next);
});

export const setAccentSecondaryAtom = atom(null, (get, set, color: string) => {
  const prev = get(settingsAtom);
  const next = {
    ...prev,
    appearance: {
      ...prev.appearance,
      accent_mode: "manual" as const,
      manual_secondary: color,
    },
  };
  set(settingsAtom, next);
  writeSettings(next).catch(() => undefined);
  triggerSideEffects("appearance", next);
});

export const setAccentModeAtom = atom(null, (get, set, mode: "dynamic" | "manual") => {
  const prev = get(settingsAtom);
  const next = {
    ...prev,
    appearance: { ...prev.appearance, accent_mode: mode },
  };
  set(settingsAtom, next);
  writeSettings(next).catch(() => undefined);
  triggerSideEffects("appearance", next);
});

// ── Display-specific write atoms ──

export const setDisplayScaleAtom = atom(null, (get, set, scale: string) => {
  const prev = get(settingsAtom);
  const next = {
    ...prev,
    display: { ...prev.display, scale },
  };
  set(settingsAtom, next);
  writeSettings(next).catch(() => undefined);
  execScript("~/.local/bin/apply-display-scale").catch((err) => {
    logger.warn("Failed to apply display scale", err);
  });
});

export const setNightLightAtom = atom(null, (get, set, enabled: boolean) => {
  const prev = get(settingsAtom);
  const next = {
    ...prev,
    display: { ...prev.display, night_light_enabled: enabled },
  };
  set(settingsAtom, next);
  writeSettings(next).catch(() => undefined);
  execScript("~/.local/bin/night-light").catch((err) => {
    logger.warn("Failed to apply night light", err);
  });
});

export const setNightLightTempAtom = atom(null, (get, set, temp: number) => {
  const prev = get(settingsAtom);
  const next = {
    ...prev,
    display: { ...prev.display, night_light_temperature: temp },
  };
  set(settingsAtom, next);
  writeSettings(next).catch(() => undefined);
  execScript("~/.local/bin/night-light").catch((err) => {
    logger.warn("Failed to apply night light", err);
  });
});

// ── Icons-specific write atoms ──

export const setIconThemeAtom = atom(null, (get, set, theme: string) => {
  const prev = get(settingsAtom);
  const next = {
    ...prev,
    icons: { ...prev.icons, icon_theme: theme },
  };
  set(settingsAtom, next);
  writeSettings(next).catch(() => undefined);
  setGSetting("org.gnome.desktop.interface", "icon-theme", theme).catch(() => undefined);
});

export const setCursorThemeAtom = atom(null, (get, set, theme: string) => {
  const prev = get(settingsAtom);
  const next = {
    ...prev,
    icons: { ...prev.icons, cursor_theme: theme },
  };
  set(settingsAtom, next);
  writeSettings(next).catch(() => undefined);
  setGSetting("org.gnome.desktop.interface", "cursor-theme", theme).catch(() => undefined);
});

export const setCursorSizeAtom = atom(null, (get, set, size: number) => {
  const prev = get(settingsAtom);
  const next = {
    ...prev,
    icons: { ...prev.icons, cursor_size: size },
  };
  set(settingsAtom, next);
  writeSettings(next).catch(() => undefined);
  setGSetting("org.gnome.desktop.interface", "cursor-size", String(size)).catch(() => undefined);
});

// ── Sound-specific write atoms ──

export const setOutputVolumeAtom = atom(null, (get, set, vol: number) => {
  const prev = get(settingsAtom);
  const next = { ...prev, sound: { ...prev.sound, output_volume: vol } };
  set(settingsAtom, next);
  writeSettings(next).catch(() => undefined);
  triggerSideEffects("sound", next);
});

export const setOutputMutedAtom = atom(null, (get, set, muted: boolean) => {
  const prev = get(settingsAtom);
  const next = { ...prev, sound: { ...prev.sound, output_muted: muted } };
  set(settingsAtom, next);
  writeSettings(next).catch(() => undefined);
  triggerSideEffects("sound", next);
});

export const setInputVolumeAtom = atom(null, (get, set, vol: number) => {
  const prev = get(settingsAtom);
  const next = { ...prev, sound: { ...prev.sound, input_volume: vol } };
  set(settingsAtom, next);
  writeSettings(next).catch(() => undefined);
  triggerSideEffects("sound", next);
});

export const setInputMutedAtom = atom(null, (get, set, muted: boolean) => {
  const prev = get(settingsAtom);
  const next = { ...prev, sound: { ...prev.sound, input_muted: muted } };
  set(settingsAtom, next);
  writeSettings(next).catch(() => undefined);
  triggerSideEffects("sound", next);
});

// ── Wallpaper-specific write atoms ──

export const DEFAULT_WALLPAPER_INFO: WallpaperInfo = WallpaperInfoSchema.parse({});
export const wallpaperInfoAtom = atom<WallpaperInfo>(DEFAULT_WALLPAPER_INFO);
export const wallpaperInfoLoadingAtom = atom<boolean>(false);

export const refreshWallpaperInfoAtom = atom(null, async (_get, set) => {
  set(wallpaperInfoLoadingAtom, true);
  try {
    const info = await getWallpaperInfo();
    if (info) {
      set(wallpaperInfoAtom, info);
    }
  } catch (err) {
    logger.warn("Failed to refresh wallpaper info", err);
  } finally {
    set(wallpaperInfoLoadingAtom, false);
  }
});

export const setWallpaperFrequencyAtom = atom(null, (get, set, freq: string) => {
  const prev = get(settingsAtom);
  const next = {
    ...prev,
    wallpaper: { ...prev.wallpaper, frequency: freq },
  };
  set(settingsAtom, next);
  writeSettings(next).catch(() => undefined);
});

export const setWallpaperSkipTodayAtom = atom(null, (get, set, skip: boolean) => {
  const prev = get(settingsAtom);
  const next = {
    ...prev,
    wallpaper: { ...prev.wallpaper, skip_today: skip },
  };
  set(settingsAtom, next);
  writeSettings(next).catch(() => undefined);
  // Also sync skip_today file
  if (skip) {
    execScript(
      `mkdir -p ~/.local/share/dotfiles && date +%F > ~/.local/share/dotfiles/skip_today`,
    ).catch(() => undefined);
  } else {
    execScript(`rm -f ~/.local/share/dotfiles/skip_today`).catch(() => undefined);
  }
});

export const setWallpaperMoodAtom = atom(null, (get, set, mood: string | null) => {
  const prev = get(settingsAtom);
  const next = {
    ...prev,
    wallpaper: { ...prev.wallpaper, selected_mood: mood },
  };
  set(settingsAtom, next);
  writeSettings(next).catch(() => undefined);
});

export const toggleWallpaperSourceAtom = atom(null, (get, set, source: string) => {
  const prev = get(settingsAtom);
  const current = prev.wallpaper.sources_enabled[source] ?? false;
  const next = {
    ...prev,
    wallpaper: {
      ...prev.wallpaper,
      sources_enabled: { ...prev.wallpaper.sources_enabled, [source]: !current },
    },
  };
  set(settingsAtom, next);
  writeSettings(next).catch(() => undefined);
});

// ── Side effect dispatcher ──

const triggerSideEffects = (section: keyof SettingsData, data: SettingsData): void => {
  switch (section) {
    case "display":
      execScript("~/.local/bin/apply-display-scale").catch(() => undefined);
      execScript("~/.local/bin/night-light").catch(() => undefined);
      break;
    case "icons":
      void setGSetting("org.gnome.desktop.interface", "icon-theme", data.icons.icon_theme);
      void setGSetting("org.gnome.desktop.interface", "cursor-theme", data.icons.cursor_theme);
      void setGSetting(
        "org.gnome.desktop.interface",
        "cursor-size",
        String(data.icons.cursor_size),
      );
      break;
    case "appearance":
      execScript(
        `sleep 0.5 && ~/.local/bin/apply-theme "$(cat ~/.config/current_wallpaper)"`,
      ).catch(() => undefined);
      break;
    case "sound":
      // Apply via WirePlumber; silently ignored when wpctl is unavailable.
      void execScript(
        `wpctl set-volume @DEFAULT_AUDIO_SINK@ ${data.sound.output_volume}% && wpctl set-mute @DEFAULT_AUDIO_SINK@ ${data.sound.output_muted ? "1" : "0"}`,
      );
      void execScript(
        `wpctl set-volume @DEFAULT_AUDIO_SOURCE@ ${data.sound.input_volume}% && wpctl set-mute @DEFAULT_AUDIO_SOURCE@ ${data.sound.input_muted ? "1" : "0"}`,
      );
      break;
    default:
      break;
  }
};
