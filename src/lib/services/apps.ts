import { invokeRaw } from "../ipc";
import { sidecarLogger } from "../logger";
import {
  InstalledAppsPayloadSchema,
  DefaultAppsPayloadSchema,
  type DesktopApp,
  type DefaultGroup,
} from "../schemas";

export const listInstalledApps = async (): Promise<DesktopApp[]> => {
  try {
    const raw = await invokeRaw("list_installed_apps", {});
    const parsed = InstalledAppsPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      sidecarLogger.error("list_installed_apps: unexpected payload", parsed.error);
      return [];
    }
    return parsed.data.apps;
  } catch (err) {
    sidecarLogger.error("Failed to list installed apps", err);
    return [];
  }
};

export const listDefaultApps = async (): Promise<DefaultGroup[]> => {
  try {
    const raw = await invokeRaw("list_default_apps", {});
    const parsed = DefaultAppsPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      sidecarLogger.error("list_default_apps: unexpected payload", parsed.error);
      return [];
    }
    return parsed.data.groups;
  } catch (err) {
    sidecarLogger.error("Failed to list default apps", err);
    return [];
  }
};

export const setDefaultApp = async (group: string, desktopId: string): Promise<boolean> => {
  try {
    await invokeRaw("set_default_app", { group, desktop_id: desktopId });
    return true;
  } catch (err) {
    sidecarLogger.error(`Failed to set default app for ${group}`, err);
    return false;
  }
};
