import { invokeRaw } from "../ipc";
import { sidecarLogger } from "../logger";
import { InstallHelpersResponseSchema, type InstallHelpersResponse } from "../schemas";

export const installHelperScripts = async (): Promise<InstallHelpersResponse | null> => {
  try {
    const raw = await invokeRaw("install_helper_scripts", {});
    const parsed = InstallHelpersResponseSchema.safeParse(raw);
    if (!parsed.success) {
      sidecarLogger.error("install_helper_scripts: unexpected payload", parsed.error);
      return null;
    }
    return parsed.data;
  } catch (err) {
    sidecarLogger.error("Failed to install helper scripts", err);
    return null;
  }
};
