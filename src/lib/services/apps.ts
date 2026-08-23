import { callSidecar, invokeRaw } from "../ipc";
import { sidecarLogger } from "../logger";
import {
  InstalledAppsPayloadSchema,
  DefaultAppsPayloadSchema,
  type DesktopApp,
  type DefaultGroup,
} from "../schemas";

export const listInstalledApps = async (): Promise<DesktopApp[]> => {
  const payload = await callSidecar("list_installed_apps", InstalledAppsPayloadSchema, {});
  return payload?.apps ?? [];
};

export const listDefaultApps = async (): Promise<DefaultGroup[]> => {
  const payload = await callSidecar("list_default_apps", DefaultAppsPayloadSchema, {});
  return payload?.groups ?? [];
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
