import { z } from "zod";
import { invokeRaw } from "../ipc";
import { sidecarLogger } from "../logger";
import {
  WallpaperInfoSchema,
  WallpaperThumbsResultSchema,
  type WallpaperInfo,
  type WallpaperThumbsResult,
} from "../schemas/wallpaper";

const SetWallpaperResultSchema = z.object({
  status: z.string(),
  path: z.string().optional(),
});

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

export const ensureWallpaperThumbs = async (): Promise<WallpaperThumbsResult> => {
  try {
    const raw = await invokeRaw("ensure_wallpaper_thumbs");
    const result = WallpaperThumbsResultSchema.safeParse(raw);
    if (result.success) {
      sidecarLogger.info(
        `Wallpaper thumbnails ensured: ${result.data.generated} generated of ${result.data.total}`,
      );
      return result.data;
    }
    sidecarLogger.warn("ensure_wallpaper_thumbs returned unexpected shape", {
      issues: result.error.format(),
    });
    return { generated: 0, total: 0 };
  } catch (err) {
    sidecarLogger.error("Failed to ensure wallpaper thumbnails", err);
    return { generated: 0, total: 0 };
  }
};

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
