import { invokeRaw } from "../ipc";
import { sidecarLogger } from "../logger";
import {
  EnsureRunnerResponseSchema,
  StartupAppsPayloadSchema,
  type StartupAppsPayload,
} from "../schemas";

export const listStartupApps = async (): Promise<StartupAppsPayload | null> => {
  try {
    const raw = await invokeRaw("list_startup_apps", {});
    const parsed = StartupAppsPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      sidecarLogger.error("list_startup_apps: unexpected payload", parsed.error);
      return null;
    }
    return parsed.data;
  } catch (err) {
    sidecarLogger.error("Failed to list startup apps", err);
    return null;
  }
};

export const upsertStartupApp = async (
  name: string,
  command: string,
  comment: string,
): Promise<boolean> => {
  try {
    await invokeRaw("upsert_startup_app", { name, command, comment });
    return true;
  } catch (err) {
    sidecarLogger.error("Failed to create startup app", err);
    return false;
  }
};

export const setStartupAppEnabled = async (id: string, enabled: boolean): Promise<boolean> => {
  try {
    await invokeRaw("set_startup_app_enabled", { id, enabled });
    return true;
  } catch (err) {
    sidecarLogger.error(`Failed to toggle startup app: ${id}`, err);
    return false;
  }
};

export const deleteStartupApp = async (id: string): Promise<boolean> => {
  try {
    await invokeRaw("delete_startup_app", { id });
    return true;
  } catch (err) {
    sidecarLogger.error(`Failed to delete startup app: ${id}`, err);
    return false;
  }
};

export const ensureAutostartRunner = async (): Promise<"added" | "already-present" | "failed"> => {
  try {
    const raw = await invokeRaw("ensure_autostart_runner", {});
    const parsed = EnsureRunnerResponseSchema.safeParse(raw);
    if (!parsed.success) return "failed";
    return parsed.data.status;
  } catch (err) {
    sidecarLogger.error("Failed to add autostart runner", err);
    return "failed";
  }
};
