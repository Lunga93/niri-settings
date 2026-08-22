import { atom } from "jotai";
import type { Getter, Setter, WritableAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import {
  SettingsDataSchema,
  type SettingsData,
  type AppearanceSettings,
  type SoundSettings,
} from "@/lib/schemas";
import { writeSettings, readSettings, setGSetting } from "@/lib/services";
import { execScript } from "@/lib/sidecar";
import { logger, sidecarLogger } from "@/lib/logger";

// ── Default state from Zod schema ──
const DEFAULT_SETTINGS: SettingsData = SettingsDataSchema.parse({});

// ── Primitive atoms ──
export const settingsAtom = atomWithStorage<SettingsData>("niri-settings-data", DEFAULT_SETTINGS);

// ── Derived read atoms (per section) ──
export const appearanceAtom = atom((get) => get(settingsAtom).appearance);
export const topBarAtom = atom((get) => get(settingsAtom).top_bar);
export const displayAtom = atom((get) => get(settingsAtom).display);
export const iconsAtom = atom((get) => get(settingsAtom).icons);
export const soundAtom = atom((get) => get(settingsAtom).sound);

// ── Settings mutation helper ──

/**
 * Applies a mutation to the settings snapshot, stores the result,
 * persists it to disk and runs an optional side effect.
 */
const commitSettings = (
  get: Getter,
  set: Setter,
  mutate: (prev: SettingsData) => SettingsData,
  sideEffect?: (next: SettingsData) => void,
): void => {
  const next = mutate(get(settingsAtom));
  set(settingsAtom, next);
  writeSettings(next).catch((err) => {
    sidecarLogger.error("Failed to persist settings", err);
  });
  sideEffect?.(next);
};

// ── Generic write atoms ──

/**
 * Write to any settings field. Persists to disk and triggers side effects.
 */
export const setSettingsFieldAtom = atom(
  null,
  (get, set, update: { section: keyof SettingsData; key: string; value: unknown }) => {
    commitSettings(
      get,
      set,
      (prev) => ({
        ...prev,
        [update.section]: {
          ...prev[update.section],
          [update.key]: update.value,
        },
      }),
      (next) => triggerSideEffects(update.section, next),
    );
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
    commitSettings(
      get,
      set,
      (prev) => ({
        ...prev,
        [update.section]: {
          ...prev[update.section],
          ...update.partial,
        },
      }),
      (next) => triggerSideEffects(update.section, next),
    );
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

// ── Appearance-specific write atoms ──

export const setColorSchemeAtom = atom(null, (get, set, scheme: "dark" | "light") => {
  commitSettings(
    get,
    set,
    (prev) => ({ ...prev, appearance: { ...prev.appearance, color_scheme: scheme } }),
    (next) => triggerSideEffects("appearance", next),
  );
});

const accentColorAtom = (
  key: "manual_primary" | "manual_secondary",
): WritableAtom<null, [color: string], void> =>
  atom(null, (get, set, color: string) => {
    commitSettings(
      get,
      set,
      (prev) => {
        const appearance: AppearanceSettings = { ...prev.appearance, accent_mode: "manual" };
        appearance[key] = color;
        return { ...prev, appearance };
      },
      (next) => triggerSideEffects("appearance", next),
    );
  });

export const setAccentColorAtom = accentColorAtom("manual_primary");

export const setAccentSecondaryAtom = accentColorAtom("manual_secondary");

export const setAccentModeAtom = atom(null, (get, set, mode: "dynamic" | "manual") => {
  commitSettings(
    get,
    set,
    (prev) => ({ ...prev, appearance: { ...prev.appearance, accent_mode: mode } }),
    (next) => triggerSideEffects("appearance", next),
  );
});

// ── Display-specific write atoms ──

export const setDisplayScaleAtom = atom(null, (get, set, scale: string) => {
  commitSettings(
    get,
    set,
    (prev) => ({ ...prev, display: { ...prev.display, scale } }),
    () => {
      execScript("~/.local/bin/apply-display-scale").catch((err) => {
        logger.warn("Failed to apply display scale", err);
      });
    },
  );
});

export const setNightLightAtom = atom(null, (get, set, enabled: boolean) => {
  commitSettings(
    get,
    set,
    (prev) => ({ ...prev, display: { ...prev.display, night_light_enabled: enabled } }),
    () => {
      execScript("~/.local/bin/night-light").catch((err) => {
        logger.warn("Failed to apply night light", err);
      });
    },
  );
});

export const setNightLightTempAtom = atom(null, (get, set, temp: number) => {
  commitSettings(
    get,
    set,
    (prev) => ({ ...prev, display: { ...prev.display, night_light_temperature: temp } }),
    () => {
      execScript("~/.local/bin/night-light").catch((err) => {
        logger.warn("Failed to apply night light", err);
      });
    },
  );
});

// ── Icons-specific write atoms ──

export const setIconThemeAtom = atom(null, (get, set, theme: string) => {
  commitSettings(
    get,
    set,
    (prev) => ({ ...prev, icons: { ...prev.icons, icon_theme: theme } }),
    () => {
      setGSetting("org.gnome.desktop.interface", "icon-theme", theme).catch(() => undefined);
    },
  );
});

export const setCursorThemeAtom = atom(null, (get, set, theme: string) => {
  commitSettings(
    get,
    set,
    (prev) => ({ ...prev, icons: { ...prev.icons, cursor_theme: theme } }),
    () => {
      setGSetting("org.gnome.desktop.interface", "cursor-theme", theme).catch(() => undefined);
    },
  );
});

export const setCursorSizeAtom = atom(null, (get, set, size: number) => {
  commitSettings(
    get,
    set,
    (prev) => ({ ...prev, icons: { ...prev.icons, cursor_size: size } }),
    () => {
      setGSetting("org.gnome.desktop.interface", "cursor-size", String(size)).catch(
        () => undefined,
      );
    },
  );
});

// ── Sound-specific write atoms ──

const soundVolumeFieldAtom = (
  key: "output_volume" | "input_volume",
): WritableAtom<null, [volume: number], void> =>
  atom(null, (get, set, volume: number) => {
    commitSettings(
      get,
      set,
      (prev) => {
        const sound: SoundSettings = { ...prev.sound };
        sound[key] = volume;
        return { ...prev, sound };
      },
      (next) => triggerSideEffects("sound", next),
    );
  });

const soundMutedFieldAtom = (
  key: "output_muted" | "input_muted",
): WritableAtom<null, [muted: boolean], void> =>
  atom(null, (get, set, muted: boolean) => {
    commitSettings(
      get,
      set,
      (prev) => {
        const sound: SoundSettings = { ...prev.sound };
        sound[key] = muted;
        return { ...prev, sound };
      },
      (next) => triggerSideEffects("sound", next),
    );
  });

export const setOutputVolumeAtom = soundVolumeFieldAtom("output_volume");

export const setInputVolumeAtom = soundVolumeFieldAtom("input_volume");

export const setOutputMutedAtom = soundMutedFieldAtom("output_muted");

export const setInputMutedAtom = soundMutedFieldAtom("input_muted");

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
