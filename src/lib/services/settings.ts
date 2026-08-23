import { invokeRaw } from "../ipc";
import { sidecarLogger } from "../logger";
import { SettingsDataSchema, type SettingsData } from "../schemas";

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

// Serialized so rapid slider ticks cannot interleave and let an older
// snapshot overwrite a newer one on disk.
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
