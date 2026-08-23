import { invokeRaw } from "../ipc";
import { sidecarLogger } from "../logger";
import { DesktopThemesSchema, type DesktopThemes } from "../schemas";

export const listDesktopThemes = async (): Promise<DesktopThemes | null> => {
  try {
    const raw = await invokeRaw("list_desktop_themes", {});
    const parsed = DesktopThemesSchema.safeParse(raw);
    if (!parsed.success) {
      sidecarLogger.error("list_desktop_themes: unexpected payload", parsed.error);
      return null;
    }
    return parsed.data;
  } catch (err) {
    sidecarLogger.error("Failed to list desktop themes", err);
    return null;
  }
};

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

// Patches niri's `cursor { }` config block plus the session environment file,
// then hot-reloads the compositor. Complements set_gsetting for cursors.
export const setNiriCursor = async (theme: string, size: number): Promise<boolean> => {
  try {
    await invokeRaw("set_niri_cursor", { theme, size });
    return true;
  } catch (err) {
    sidecarLogger.error("Failed to set niri cursor", err);
    return false;
  }
};

export const readFile = async (path: string): Promise<string | null> => {
  try {
    const raw = await invokeRaw("read_file", { path });
    return typeof raw === "string" ? raw : null;
  } catch (err) {
    sidecarLogger.error(`Failed to read file: ${path}`, err);
    return null;
  }
};

export const writeFile = async (path: string, content: string): Promise<boolean> => {
  try {
    await invokeRaw("write_file", { path, content });
    return true;
  } catch (err) {
    sidecarLogger.error(`Failed to write file: ${path}`, err);
    return false;
  }
};

export const openFile = async (path: string): Promise<boolean> => {
  try {
    await invokeRaw("open_file", { path });
    return true;
  } catch (err) {
    sidecarLogger.error(`Failed to open file: ${path}`, err);
    return false;
  }
};
