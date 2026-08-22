import { atom } from "jotai";
import { WallpaperInfoSchema, type WallpaperInfo, type WallpaperItem } from "./schemas/wallpaper";
import {
  getWallpaperInfo,
  setWallpaper,
  getThemeColors,
  writeSettings,
  ensureWallpaperThumbs,
} from "./services";
import { pywalThemeAtom, applyThemeToDOM } from "./themeAtoms";
import { settingsAtom, appearanceAtom } from "./atoms";
import { execScript } from "./sidecar";
import { logger } from "./logger";

export const wallpaperAtom = atom((get) => get(settingsAtom).wallpaper);

export const DEFAULT_WALLPAPER_INFO: WallpaperInfo = WallpaperInfoSchema.parse({});
export const wallpaperInfoAtom = atom<WallpaperInfo>(DEFAULT_WALLPAPER_INFO);
export const wallpaperInfoLoadingAtom = atom<boolean>(false);
export const wallpaperInfoErrorAtom = atom<string | null>(null);
export const wallpaperApplyingAtom = atom<boolean>(false);
export const wallpaperApplyErrorAtom = atom<string | null>(null);
export const selectedWallpaperPathAtom = atom<string | null>(null);
export const wallpaperThumbsVersionAtom = atom<number>(0);

/**
 * Wallpapers filtered by the currently active mood (or all if selected_mood is null).
 */
export const filteredWallpapersAtom = atom<WallpaperItem[]>((get) => {
  const info = get(wallpaperInfoAtom);
  const selectedMood = get(wallpaperAtom).selected_mood;

  // Fallback when info.wallpapers array is empty but wallpapers_by_mood has paths
  if (!info.wallpapers || info.wallpapers.length === 0) {
    if (selectedMood) {
      const moodKey = selectedMood.toLowerCase();
      const paths = info.wallpapers_by_mood[moodKey] || [];
      return paths.map((path) => ({
        path,
        filename: path.split("/").pop() ?? "",
        name: (path.split("/").pop() ?? "").replace(/\.[^/.]+$/, ""),
        moods: [moodKey],
        file_size: 0,
        mtime: 0,
        thumbnail: "",
      }));
    }
    // "All" view with empty info.wallpapers: aggregate all unique paths across all mood categories
    const moodMap = new Map<string, Set<string>>();
    for (const [mood, paths] of Object.entries(info.wallpapers_by_mood || {})) {
      if (Array.isArray(paths)) {
        for (const p of paths) {
          if (!moodMap.has(p)) {
            moodMap.set(p, new Set());
          }
          moodMap.get(p)!.add(mood.toLowerCase());
        }
      }
    }
    return Array.from(moodMap.entries()).map(([path, moods]) => ({
      path,
      filename: path.split("/").pop() ?? "",
      name: (path.split("/").pop() ?? "").replace(/\.[^/.]+$/, ""),
      moods: Array.from(moods),
      file_size: 0,
      mtime: 0,
      thumbnail: "",
    }));
  }

  if (!selectedMood) {
    return info.wallpapers;
  }

  const moodLower = selectedMood.toLowerCase();
  const moodPaths = new Set((info.wallpapers_by_mood[moodLower] || []).map((p) => p.toLowerCase()));

  return info.wallpapers.filter(
    (item) =>
      item.moods.some((m) => m.toLowerCase() === moodLower) ||
      moodPaths.has(item.path.toLowerCase()),
  );
});

export const refreshWallpaperInfoAtom = atom(null, async (_get, set) => {
  set(wallpaperInfoLoadingAtom, true);
  set(wallpaperInfoErrorAtom, null);
  try {
    const info = await getWallpaperInfo();
    if (info) {
      set(wallpaperInfoAtom, info);
      set(wallpaperInfoErrorAtom, null);
      logger.info(
        `Wallpaper info loaded: ${info.total_scanned} wallpapers scanned, current: ${info.current_wallpaper || "none"}`,
      );
      try {
        await ensureWallpaperThumbs();
      } finally {
        set(wallpaperThumbsVersionAtom, (v) => v + 1);
      }
    } else {
      set(wallpaperInfoErrorAtom, "Unable to retrieve wallpapers from sidecar backend.");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("Failed to refresh wallpaper info", err);
    set(wallpaperInfoErrorAtom, `Failed to load wallpapers: ${msg}`);
  } finally {
    set(wallpaperInfoLoadingAtom, false);
  }
});

export const selectWallpaperAtom = atom(null, (_get, set, path: string | null) => {
  set(selectedWallpaperPathAtom, path);
});

export const applyWallpaperAtom = atom(
  null,
  async (get, set, wallpaperPath: string): Promise<boolean> => {
    if (!wallpaperPath) return false;
    set(wallpaperApplyingAtom, true);
    set(wallpaperApplyErrorAtom, null);
    try {
      const success = await setWallpaper(wallpaperPath);
      if (!success) {
        set(wallpaperApplyErrorAtom, `Failed to apply wallpaper: ${wallpaperPath}`);
        return false;
      }
      set(selectedWallpaperPathAtom, wallpaperPath);
      const prevInfo = get(wallpaperInfoAtom);
      set(wallpaperInfoAtom, {
        ...prevInfo,
        current_wallpaper: wallpaperPath,
      });
      const themeData = await getThemeColors();
      if (themeData) {
        set(pywalThemeAtom, themeData);
        const appearance = get(appearanceAtom);
        applyThemeToDOM(themeData, appearance);
      }
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("Failed to apply wallpaper", err);
      set(wallpaperApplyErrorAtom, msg);
      return false;
    } finally {
      set(wallpaperApplyingAtom, false);
    }
  },
);

export const setWallpaperFrequencyAtom = atom(null, (get, set, freq: string) => {
  const prev = get(settingsAtom);
  const next = {
    ...prev,
    wallpaper: { ...prev.wallpaper, frequency: freq },
  };
  set(settingsAtom, next);
  writeSettings(next).catch(() => undefined);
});

export const setWallpaperSkipTodayAtom = atom(null, (get, set, skip: boolean) => {
  const prev = get(settingsAtom);
  const next = {
    ...prev,
    wallpaper: { ...prev.wallpaper, skip_today: skip },
  };
  set(settingsAtom, next);
  writeSettings(next).catch(() => undefined);
  // Also sync skip_today file
  if (skip) {
    execScript(
      `mkdir -p ~/.local/share/dotfiles && date +%F > ~/.local/share/dotfiles/skip_today`,
    ).catch(() => undefined);
  } else {
    execScript(`rm -f ~/.local/share/dotfiles/skip_today`).catch(() => undefined);
  }
});

export const setWallpaperMoodAtom = atom(null, (get, set, mood: string | null) => {
  const prev = get(settingsAtom);
  const next = {
    ...prev,
    wallpaper: { ...prev.wallpaper, selected_mood: mood },
  };
  set(settingsAtom, next);
  writeSettings(next).catch(() => undefined);
});

export const toggleWallpaperSourceAtom = atom(null, (get, set, source: string) => {
  const prev = get(settingsAtom);
  const current = prev.wallpaper.sources_enabled[source] ?? false;
  const next = {
    ...prev,
    wallpaper: {
      ...prev.wallpaper,
      sources_enabled: { ...prev.wallpaper.sources_enabled, [source]: !current },
    },
  };
  set(settingsAtom, next);
  writeSettings(next).catch(() => undefined);
});
