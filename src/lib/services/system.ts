import { invokeRaw } from "../ipc";
import { sidecarLogger } from "../logger";
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
