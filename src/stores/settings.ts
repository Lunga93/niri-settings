import { atom } from "jotai";
import type { Getter, Setter, WritableAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { SettingsDataSchema, type SettingsData, type SoundSettings } from "@/lib/schemas";
import { writeSettings, readSettings, setGSetting, setNiriCursor } from "@/lib/services";
import { execScript } from "@/lib/ipc";
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

// Last gsettings failure message, surfaced on the Icons page.
export const gsettingErrorAtom = atom<string | null>(null);

// Original values captured before the first override, so a broken theme
// choice can always be rolled back.
export const iconsBackupAtom = atomWithStorage<{ icon_theme?: string; cursor_theme?: string }>(
  "niri-icons-backup",
  {},
);

const applyGSetting = async (schema: string, key: string, value: string): Promise<boolean> => {
  const ok = await setGSetting(schema, key, value);
  if (!ok) logger.warn(`gsettings apply failed: ${schema} ${key}=${value}`);
  return ok;
};

// Cursors need both the gsettings key (GTK apps) and niri's config block
// (compositor + future sessions via environment.d) to take full effect.
const applyCursor = async (theme: string, size: number): Promise<void> => {
  await applyGSetting("org.gnome.desktop.interface", "cursor-theme", theme);
  await applyGSetting("org.gnome.desktop.interface", "cursor-size", String(size));
  const ok = await setNiriCursor(theme, size);
  if (!ok) logger.warn(`niri cursor apply failed: ${theme} ${size}`);
};

export const setIconThemeAtom = atom(null, (get, set, theme: string) => {
  const current = get(settingsAtom).icons.icon_theme;
  const backup = get(iconsBackupAtom);
  if (backup.icon_theme === undefined && theme !== current) {
    set(iconsBackupAtom, { ...backup, icon_theme: current });
  }
  commitSettings(
    get,
    set,
    (prev) => ({ ...prev, icons: { ...prev.icons, icon_theme: theme } }),
    () => {
      void applyGSetting("org.gnome.desktop.interface", "icon-theme", theme).then((ok) =>
        set(gsettingErrorAtom, ok ? null : `Failed to apply icon theme "${theme}"`),
      );
    },
  );
});

export const setCursorThemeAtom = atom(null, (get, set, theme: string) => {
  const current = get(settingsAtom).icons.cursor_theme;
  const backup = get(iconsBackupAtom);
  if (backup.cursor_theme === undefined && theme !== current) {
    set(iconsBackupAtom, { ...backup, cursor_theme: current });
  }
  commitSettings(
    get,
    set,
    (prev) => ({ ...prev, icons: { ...prev.icons, cursor_theme: theme } }),
    () => {
      void applyCursor(theme, get(settingsAtom).icons.cursor_size);
    },
  );
});

export const setCursorSizeAtom = atom(null, (get, set, size: number) => {
  commitSettings(
    get,
    set,
    (prev) => ({ ...prev, icons: { ...prev.icons, cursor_size: size } }),
    () => {
      void applyCursor(get(settingsAtom).icons.cursor_theme, size);
    },
  );
});

// Restores whichever slots were captured before the first override.
export const restoreIconsBackupAtom = atom(null, (get, set) => {
  const backup = get(iconsBackupAtom);
  if (!backup.icon_theme && !backup.cursor_theme) return;
  commitSettings(
    get,
    set,
    (prev) => ({
      ...prev,
      icons: {
        ...prev.icons,
        ...(backup.icon_theme ? { icon_theme: backup.icon_theme } : {}),
        ...(backup.cursor_theme ? { cursor_theme: backup.cursor_theme } : {}),
      },
    }),
    () => {
      if (backup.icon_theme) {
        void applyGSetting("org.gnome.desktop.interface", "icon-theme", backup.icon_theme);
      }
      if (backup.cursor_theme) {
        void applyCursor(backup.cursor_theme, get(settingsAtom).icons.cursor_size);
      }
      set(iconsBackupAtom, {});
      set(gsettingErrorAtom, null);
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
