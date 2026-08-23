import { invokeRaw } from "../ipc";
import { sidecarLogger } from "../logger";
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
export const readKeybindings = async (): Promise<unknown> => {
  sidecarLogger.info("Reading keybindings from niri config");
  try {
    return await invokeRaw("read_keybindings");
  } catch (err) {
    sidecarLogger.error("Failed to read keybindings", err);
    return null;
  }
};
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
