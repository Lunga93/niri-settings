import { z } from "zod";
import { invokeRaw } from "./sidecar";
import {
  SettingsDataSchema,
  PywalThemeSchema,
  AudioInfoSchema,
  type SettingsData,
  type PywalTheme,
  type AudioInfo,
  type DisplayLayoutConfig,
} from "./schemas";
import {
  WallpaperInfoSchema,
  WallpaperListSchema,
  WallpaperThumbsResultSchema,
  type WallpaperInfo,
  type WallpaperItem,
} from "./schemas/wallpaper";
import { sidecarLogger } from "./logger";

const SetWallpaperResultSchema = z.object({
  status: z.string(),
  path: z.string().optional(),
});

/**
 * Reads the settings.json file from disk via the sidecar.
 * Returns validated SettingsData or null on failure.
 */
export const readSettings = async (): Promise<SettingsData | null> => {
  sidecarLogger.info("Reading settings.json from disk");
  try {
    const raw = await invokeRaw("read_settings");
    if (typeof raw !== "string") {
      sidecarLogger.warn("read_settings returned non-string", raw);
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    const result = SettingsDataSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    sidecarLogger.warn("Settings JSON failed Zod validation", result.error.flatten());
    return null;
  } catch (err) {
    sidecarLogger.error("Failed to read settings", err);
    return null;
  }
};

/**
 * Writes the settings data to disk via the sidecar.
 * Auto-reloads quickshell after write.
 * Writes are serialized: rapid slider ticks must not interleave
 * and let an older snapshot overwrite a newer one.
 */
let writeQueue: Promise<unknown> = Promise.resolve();

export const writeSettings = async (data: SettingsData): Promise<boolean> => {
  const job = writeQueue.then(() => doWriteSettings(data));
  writeQueue = job.catch(() => undefined);
  return job;
};

const doWriteSettings = async (data: SettingsData): Promise<boolean> => {
  sidecarLogger.info("Writing settings.json to disk");
  try {
    const content = JSON.stringify(data, null, 2);
    await invokeRaw("write_settings", { content });
    return true;
  } catch (err) {
    sidecarLogger.error("Failed to write settings", err);
    return false;
  }
};

/**
 * Reads the niri config.kdl file from disk via the sidecar.
 */
export const readNiriConfig = async (): Promise<string | null> => {
  sidecarLogger.info("Reading niri config.kdl");
  try {
    const raw = await invokeRaw("read_niri_config");
    if (raw && typeof raw === "object" && "content" in raw && typeof raw.content === "string") {
      return raw.content;
    }
    return null;
  } catch (err) {
    sidecarLogger.error("Failed to read niri config", err);
    return null;
  }
};

/**
 * Writes the niri config.kdl and triggers niri reload.
 */
export const writeNiriConfig = async (content: string): Promise<boolean> => {
  sidecarLogger.info("Writing niri config.kdl");
  try {
    await invokeRaw("write_niri_config", { content });
    return true;
  } catch (err) {
    sidecarLogger.error("Failed to write niri config", err);
    return false;
  }
};

/**
 * Runs `niri validate` to check config syntax.
 */
export const validateNiriConfig = async (): Promise<boolean> => {
  sidecarLogger.info("Validating niri config");
  try {
    await invokeRaw("validate_niri_config");
    return true;
  } catch (err) {
    sidecarLogger.error("Niri config validation failed", err);
    return false;
  }
};

/**
 * Queries niri for connected display outputs.
 */
export const listDisplayOutputs = async (): Promise<unknown> => {
  sidecarLogger.info("Querying display outputs");
  try {
    return await invokeRaw("list_outputs");
  } catch (err) {
    sidecarLogger.error("Failed to list outputs", err);
    return null;
  }
};

/**
 * Sets a GSettings value via the sidecar.
 */
export const setGSetting = async (schema: string, key: string, value: string): Promise<boolean> => {
  sidecarLogger.info(`gsettings set ${schema} ${key} ${value}`);
  try {
    await invokeRaw("set_gsetting", { schema, key, value });
    return true;
  } catch (err) {
    sidecarLogger.error("Failed to set gsetting", err);
    return false;
  }
};

/**
 * Reads an arbitrary file from disk.
 */
export const readFile = async (path: string): Promise<string | null> => {
  try {
    const raw = await invokeRaw("read_file", { path });
    return typeof raw === "string" ? raw : null;
  } catch (err) {
    sidecarLogger.error(`Failed to read file: ${path}`, err);
    return null;
  }
};

/**
 * Writes content to an arbitrary file path.
 */
export const writeFile = async (path: string, content: string): Promise<boolean> => {
  try {
    await invokeRaw("write_file", { path, content });
    return true;
  } catch (err) {
    sidecarLogger.error(`Failed to write file: ${path}`, err);
    return false;
  }
};

/**
 * Queries niri for the currently focused output name.
 */
export const getFocusedOutput = async (): Promise<string | null> => {
  try {
    const raw = await invokeRaw("focused_output");
    if (raw && typeof raw === "object" && "name" in raw && typeof raw.name === "string") {
      return raw.name;
    }
    return null;
  } catch (err) {
    sidecarLogger.error("Failed to get focused output", err);
    return null;
  }
};

/**
 * Reloads niri config via `niri msg action reload-config`.
 */
export const reloadNiriConfig = async (): Promise<boolean> => {
  sidecarLogger.info("Reloading niri config");
  try {
    await invokeRaw("reload_config");
    return true;
  } catch (err) {
    sidecarLogger.error("Failed to reload niri config", err);
    return false;
  }
};

/**
 * Opens a file in the user's default editor via the sidecar.
 */
export const openFile = async (path: string): Promise<boolean> => {
  try {
    await invokeRaw("open_file", { path });
    return true;
  } catch (err) {
    sidecarLogger.error(`Failed to open file: ${path}`, err);
    return false;
  }
};

/**
 * Gets the niri config file path from the sidecar.
 */
export const getNiriConfigPath = async (): Promise<string | null> => {
  try {
    const raw = await invokeRaw("read_niri_config");
    if (raw && typeof raw === "object" && "path" in raw && typeof raw.path === "string") {
      return raw.path;
    }
    return null;
  } catch (err) {
    sidecarLogger.error("Failed to get niri config path", err);
    return null;
  }
};

/**
 * Reads keybindings from the niri config file.
 */
export const readKeybindings = async (): Promise<unknown> => {
  sidecarLogger.info("Reading keybindings from niri config");
  try {
    return await invokeRaw("read_keybindings");
  } catch (err) {
    sidecarLogger.error("Failed to read keybindings", err);
    return null;
  }
};

/**
 * Updates a single keybinding in the niri config and reloads niri.
 */
export const writeKeybinding = async (
  oldKey: string,
  newKey: string,
  action: string,
): Promise<boolean> => {
  sidecarLogger.info(`Updating keybinding: ${action} from ${oldKey} to ${newKey}`);
  try {
    await invokeRaw("write_keybinding", { oldKey, newKey, action });
    return true;
  } catch (err) {
    sidecarLogger.error("Failed to write keybinding", err);
    return false;
  }
};

/**
 * Retrieves wallpaper metadata and mood counts from sidecar.
 */
export const getWallpaperInfo = async (): Promise<WallpaperInfo | null> => {
  sidecarLogger.info("Getting wallpaper info from sidecar");
  try {
    const raw = await invokeRaw("get_wallpaper_info");
    const result = WallpaperInfoSchema.safeParse(raw);
    if (result.success) {
      sidecarLogger.info(
        `Successfully retrieved wallpaper info: ${result.data.total_scanned} scanned, ${result.data.wallpapers?.length ?? 0} items in catalog`,
      );
      return result.data;
    }
    sidecarLogger.error("get_wallpaper_info returned unexpected shape (schema validation failed)", {
      issues: result.error.format(),
    });
    return null;
  } catch (err) {
    sidecarLogger.error("Failed to get wallpaper info from sidecar", err);
    return null;
  }
};

/**
 * Retrieves the list of indexed wallpapers from the sidecar.
 */
export const listWallpapers = async (): Promise<WallpaperItem[]> => {
  sidecarLogger.info("Listing wallpapers from sidecar");
  try {
    const raw = await invokeRaw("list_wallpapers");
    const result = WallpaperListSchema.safeParse(raw);
    if (result.success) {
      return result.data.wallpapers;
    }
    sidecarLogger.error("list_wallpapers returned unexpected shape (schema validation failed)", {
      issues: result.error.format(),
    });
    return [];
  } catch (err) {
    sidecarLogger.error("Failed to list wallpapers", err);
    return [];
  }
};

/**
 * Generates missing/stale thumbnails for the wallpaper catalog via sidecar.
 */
export const ensureWallpaperThumbs = async (): Promise<boolean> => {
  try {
    const raw = await invokeRaw("ensure_wallpaper_thumbs");
    const result = WallpaperThumbsResultSchema.safeParse(raw);
    if (result.success) {
      sidecarLogger.info(
        `Wallpaper thumbnails ensured: ${result.data.generated} generated of ${result.data.total}`,
      );
      return true;
    }
    sidecarLogger.warn("ensure_wallpaper_thumbs returned unexpected shape", {
      issues: result.error.format(),
    });
    return false;
  } catch (err) {
    sidecarLogger.error("Failed to ensure wallpaper thumbnails", err);
    return false;
  }
};

/**
 * Sets the desktop wallpaper via sidecar.
 */
export const setWallpaper = async (wallpaperPath: string): Promise<boolean> => {
  sidecarLogger.info(`Setting wallpaper to: ${wallpaperPath}`);
  try {
    const raw = await invokeRaw("set_wallpaper", { path: wallpaperPath });
    const result = SetWallpaperResultSchema.safeParse(raw);
    if (result.success && result.data.status === "ok") {
      return true;
    }
    return result.success;
  } catch (err) {
    sidecarLogger.error(`Failed to set wallpaper to ${wallpaperPath}`, err);
    return false;
  }
};

/**
 * Retrieves pywal color scheme from sidecar.
 */
export const getThemeColors = async (): Promise<PywalTheme | null> => {
  sidecarLogger.info("Getting theme colors from sidecar");
  try {
    const raw = await invokeRaw("get_theme_colors");
    const result = PywalThemeSchema.safeParse(raw);
    if (result.success) {
      return result.data;
    }
    sidecarLogger.warn("get_theme_colors returned unexpected shape", raw);
    return null;
  } catch (err) {
    sidecarLogger.error("Failed to get theme colors", err);
    return null;
  }
};

/**
 * Retrieves audio devices (sinks and sources) from sidecar.
 */
export const getAudioDevices = async (): Promise<AudioInfo | null> => {
  sidecarLogger.info("Getting audio devices from sidecar");
  try {
    const raw = await invokeRaw("get_audio_devices");
    const result = AudioInfoSchema.safeParse(raw);
    if (result.success) {
      return result.data;
    }
    sidecarLogger.warn("get_audio_devices returned unexpected shape", raw);
    return null;
  } catch (err) {
    sidecarLogger.error("Failed to get audio devices", err);
    return null;
  }
};

/**
 * Sets the default audio sink or source in WirePlumber.
 */
export const setDefaultAudioDevice = async (id: number): Promise<boolean> => {
  sidecarLogger.info(`Setting default audio device to ID ${id}`);
  try {
    await invokeRaw("set_audio_device", { id });
    return true;
  } catch (err) {
    sidecarLogger.error("Failed to set default audio device", err);
    return false;
  }
};

/**
 * Sets volume and mute state for an audio device.
 */
export const setAudioDeviceVolume = async (
  id: number,
  volume: number,
  muted: boolean,
): Promise<boolean> => {
  try {
    await invokeRaw("set_audio_volume", { id, volume, muted });
    return true;
  } catch (err) {
    sidecarLogger.error("Failed to set audio volume", err);
    return false;
  }
};

/**
 * Plays a test audio sound.
 */
export const testAudio = async (): Promise<boolean> => {
  try {
    await invokeRaw("test_audio");
    return true;
  } catch (err) {
    sidecarLogger.error("Failed to test audio", err);
    return false;
  }
};

/**
 * Applies display layout coordinates and transforms to niri and wlr-randr.
 */
export const applyDisplayLayout = async (displays: DisplayLayoutConfig[]): Promise<boolean> => {
  sidecarLogger.info("Applying display layout", displays);
  try {
    await invokeRaw("apply_display_layout", { displays });
    return true;
  } catch (err) {
    sidecarLogger.error("Failed to apply display layout", err);
    return false;
  }
};
