import { invokeRaw } from "../ipc";
import { sidecarLogger } from "../logger";
import { PywalThemeSchema, type PywalTheme } from "../schemas";

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
