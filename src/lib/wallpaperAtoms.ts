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

// Per-URL confirmed load state. Global because cached images can fire onLoad
// before React attaches listeners; per-card state would stay stuck at loading.
export type ThumbLoadStatus = "loaded" | "error";
export const thumbStatusAtom = atom<Record<string, ThumbLoadStatus>>({});
export const markThumbStatusAtom = atom(
  null,
  (get, set, params: { src: string; status: ThumbLoadStatus }) => {
    if (get(thumbStatusAtom)[params.src] === params.status) return;
    set(thumbStatusAtom, { ...get(thumbStatusAtom), [params.src]: params.status });
  },
);
export const galleryVisibleCountAtom = atom<number>(24);

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

// Shared in-flight promise: concurrent callers (StrictMode double-mount,
// refresh button) join one sidecar cycle instead of racing duplicates.
let inflightRefresh: Promise<void> | null = null;

export const refreshWallpaperInfoAtom = atom(null, async (_get, set) => {
  if (inflightRefresh) return inflightRefresh;
  const run = (async () => {
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
          // Bumping the version reloads every thumb URL; skip it when nothing
          // regenerated or revisiting the page flashes the grid to skeletons.
          const thumbs = await ensureWallpaperThumbs();
          if (thumbs.generated > 0) {
            logger.info(`Thumbnails refreshed: ${thumbs.generated} generated of ${thumbs.total}`);
            set(wallpaperThumbsVersionAtom, (v) => v + 1);
          }
        } catch {
          // Logged in the service layer; info payload is still usable.
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
  })();
  inflightRefresh = run;
  try {
    await run;
  } finally {
    if (inflightRefresh === run) inflightRefresh = null;
  }
});

export const selectWallpaperAtom = atom(null, (_get, set, path: string | null) => {
  set(selectedWallpaperPathAtom, path);
});

// fetch-wallpaper replaces daily.jpg in place, so current_wallpaper keeps its
// old URL — bump the thumbs version and re-read the theme like a manual apply.
export const fetchNewWallpaperAtom = atom(null, async (get, set): Promise<boolean> => {
  try {
    await execScript("~/.local/bin/fetch-wallpaper");
  } catch (err) {
    logger.error("Failed to fetch wallpaper", err);
    return false;
  }
  await set(refreshWallpaperInfoAtom);
  set(wallpaperThumbsVersionAtom, (v) => v + 1);
  try {
    const themeData = await getThemeColors();
    if (themeData) {
      set(pywalThemeAtom, themeData);
      applyThemeToDOM(themeData, get(appearanceAtom));
    }
  } catch (err) {
    logger.error("Failed to refresh theme after wallpaper fetch", err);
  }
  return true;
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
