import { describe, it, expect, vi, beforeEach } from "vitest";
import { createStore } from "jotai";
import {
  wallpaperAtom,
  wallpaperInfoAtom,
  wallpaperInfoLoadingAtom,
  wallpaperInfoErrorAtom,
  filteredWallpapersAtom,
  selectedWallpaperPathAtom,
  wallpaperApplyingAtom,
  wallpaperApplyErrorAtom,
  refreshWallpaperInfoAtom,
  selectWallpaperAtom,
  applyWallpaperAtom,
  setWallpaperFrequencyAtom,
  setWallpaperMoodAtom,
  setWallpaperSkipTodayAtom,
  toggleWallpaperSourceAtom,
  wallpaperThumbsVersionAtom,
  galleryVisibleCountAtom,
  thumbStatusAtom,
  markThumbStatusAtom,
  fetchNewWallpaperAtom,
} from "../wallpaper";
import * as services from "@/lib/services";

vi.mock("@/lib/services", () => ({
  writeSettings: vi.fn().mockResolvedValue(true),
  readSettings: vi.fn().mockResolvedValue(null),
  ensureWallpaperThumbs: vi.fn().mockResolvedValue({ generated: 0, total: 2 }),
  getWallpaperInfo: vi.fn().mockResolvedValue({
    current_wallpaper: "/home/user/Pictures/wallpapers/forest.jpg",
    total_scanned: 10,
    mood_counts: { dark: 5, light: 5, warm: 0, cool: 0, sky: 0, earth: 0 },
    wallpapers_by_mood: {
      dark: ["/home/user/Pictures/wallpapers/dark1.jpg"],
      light: ["/home/user/Pictures/wallpapers/light1.jpg"],
      warm: [],
      cool: [],
      sky: [],
      earth: [],
    },
    wallpapers: [
      {
        path: "/home/user/Pictures/wallpapers/dark1.jpg",
        filename: "dark1.jpg",
        name: "dark1",
        moods: ["dark"],
        file_size: 1000,
        mtime: 12345,
      },
      {
        path: "/home/user/Pictures/wallpapers/light1.jpg",
        filename: "light1.jpg",
        name: "light1",
        moods: ["light"],
        file_size: 2000,
        mtime: 12346,
      },
    ],
    skip_today: false,
  }),
  setWallpaper: vi.fn().mockResolvedValue(true),
  getThemeColors: vi.fn().mockResolvedValue(null),
  runScript: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/ipc", () => ({
  execScript: vi.fn().mockResolvedValue(undefined),
}));

describe("wallpaperAtoms", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it("setWallpaperFrequencyAtom updates frequency", () => {
    store.set(setWallpaperFrequencyAtom, "hourly");
    expect(store.get(wallpaperAtom).frequency).toBe("hourly");
  });

  it("setWallpaperMoodAtom updates selected_mood and handles null", () => {
    store.set(setWallpaperMoodAtom, "ocean");
    expect(store.get(wallpaperAtom).selected_mood).toBe("ocean");
    store.set(setWallpaperMoodAtom, null);
    expect(store.get(wallpaperAtom).selected_mood).toBeNull();
  });

  it("setWallpaperSkipTodayAtom updates skip_today", () => {
    store.set(setWallpaperSkipTodayAtom, true);
    expect(store.get(wallpaperAtom).skip_today).toBe(true);
  });

  it("toggleWallpaperSourceAtom toggles sources", () => {
    store.set(toggleWallpaperSourceAtom, "local");
    expect(store.get(wallpaperAtom).sources_enabled.local).toBe(false);
    store.set(toggleWallpaperSourceAtom, "local");
    expect(store.get(wallpaperAtom).sources_enabled.local).toBe(true);
  });

  it("refreshWallpaperInfoAtom loads wallpaper info from service", async () => {
    expect(store.get(wallpaperInfoLoadingAtom)).toBe(false);
    expect(store.get(wallpaperInfoErrorAtom)).toBeNull();
    await store.set(refreshWallpaperInfoAtom);
    const info = store.get(wallpaperInfoAtom);
    expect(info.current_wallpaper).toBe("/home/user/Pictures/wallpapers/forest.jpg");
    expect(info.wallpapers).toHaveLength(2);
    expect(store.get(wallpaperInfoErrorAtom)).toBeNull();
  });

  it("refreshWallpaperInfoAtom sets wallpaperInfoErrorAtom when service returns null", async () => {
    vi.mocked(services.getWallpaperInfo).mockResolvedValueOnce(null);
    await store.set(refreshWallpaperInfoAtom);
    expect(store.get(wallpaperInfoErrorAtom)).toBe(
      "Unable to retrieve wallpapers from sidecar backend.",
    );
  });

  it("refreshWallpaperInfoAtom handles service exception", async () => {
    vi.mocked(services.getWallpaperInfo).mockRejectedValueOnce(new Error("Sidecar crashed"));
    await store.set(refreshWallpaperInfoAtom);
    expect(store.get(wallpaperInfoErrorAtom)).toBe("Failed to load wallpapers: Sidecar crashed");
  });

  it("refreshWallpaperInfoAtom does not bump thumbs version when nothing was generated", async () => {
    vi.mocked(services.ensureWallpaperThumbs).mockResolvedValue({ generated: 0, total: 2 });
    await store.set(refreshWallpaperInfoAtom);
    expect(store.get(wallpaperThumbsVersionAtom)).toBe(0);
  });

  it("refreshWallpaperInfoAtom bumps thumbs version only when thumbnails were generated", async () => {
    await store.set(refreshWallpaperInfoAtom);
    expect(store.get(wallpaperThumbsVersionAtom)).toBe(0);

    vi.mocked(services.ensureWallpaperThumbs).mockResolvedValueOnce({
      generated: 3,
      total: 2,
    });
    await store.set(refreshWallpaperInfoAtom);
    expect(store.get(wallpaperThumbsVersionAtom)).toBe(1);
  });

  it("galleryVisibleCountAtom persists across store reads (page navigation)", () => {
    store.set(galleryVisibleCountAtom, 48);
    expect(store.get(galleryVisibleCountAtom)).toBe(48);
  });

  it("filteredWallpapersAtom filters correctly", async () => {
    await store.set(refreshWallpaperInfoAtom);

    store.set(setWallpaperMoodAtom, null);
    expect(store.get(filteredWallpapersAtom)).toHaveLength(2);

    store.set(setWallpaperMoodAtom, "dark");
    const darkWallpapers = store.get(filteredWallpapersAtom);
    expect(darkWallpapers).toHaveLength(1);
    expect(darkWallpapers[0].path).toBe("/home/user/Pictures/wallpapers/dark1.jpg");

    store.set(setWallpaperMoodAtom, "warm");
    expect(store.get(filteredWallpapersAtom)).toHaveLength(0);
  });

  it("filteredWallpapersAtom falls back to aggregating wallpapers_by_mood when wallpapers array is empty", () => {
    store.set(wallpaperInfoAtom, {
      current_wallpaper: "",
      total_scanned: 3,
      mood_counts: { dark: 2, light: 1 },
      wallpapers_by_mood: {
        dark: ["/path/a.jpg", "/path/shared.jpg"],
        light: ["/path/b.jpg", "/path/shared.jpg"],
      },
      wallpapers: [],
      skip_today: false,
    });

    // When selectedMood is null ("All"), it should aggregate all unique paths
    store.set(setWallpaperMoodAtom, null);
    const allFiltered = store.get(filteredWallpapersAtom);
    expect(allFiltered).toHaveLength(3);
    const paths = allFiltered.map((item) => item.path);
    expect(paths).toContain("/path/a.jpg");
    expect(paths).toContain("/path/b.jpg");
    expect(paths).toContain("/path/shared.jpg");

    // The shared wallpaper should have both dark and light moods
    const sharedItem = allFiltered.find((item) => item.path === "/path/shared.jpg");
    expect(sharedItem?.moods).toEqual(expect.arrayContaining(["dark", "light"]));

    // When selectedMood is specific, it should return that mood's wallpapers
    store.set(setWallpaperMoodAtom, "dark");
    const darkFiltered = store.get(filteredWallpapersAtom);
    expect(darkFiltered).toHaveLength(2);
    expect(darkFiltered.map((i) => i.path)).toEqual(["/path/a.jpg", "/path/shared.jpg"]);
  });

  it("selectWallpaperAtom sets selected path", () => {
    store.set(selectWallpaperAtom, "/path/to/wp.jpg");
    expect(store.get(selectedWallpaperPathAtom)).toBe("/path/to/wp.jpg");
  });

  it("applyWallpaperAtom applies wallpaper and updates state", async () => {
    const success = await store.set(applyWallpaperAtom, "/home/user/Pictures/wallpapers/dark1.jpg");
    expect(success).toBe(true);
    expect(store.get(selectedWallpaperPathAtom)).toBe("/home/user/Pictures/wallpapers/dark1.jpg");
    expect(store.get(wallpaperApplyingAtom)).toBe(false);
    expect(store.get(wallpaperApplyErrorAtom)).toBeNull();
  });

  it("applyWallpaperAtom handles false or empty path", async () => {
    const result = await store.set(applyWallpaperAtom, "");
    expect(result).toBe(false);
  });

  it("refreshWallpaperInfoAtom dedupes concurrent invocations into one sidecar cycle", async () => {
    // Simulate the StrictMode double-mount: two concurrent callers.
    let release!: () => void;
    const pending = new Promise<null>((resolve) => {
      release = () => resolve(null);
    });
    vi.mocked(services.getWallpaperInfo).mockImplementationOnce(() => pending);

    const callsBefore = vi.mocked(services.getWallpaperInfo).mock.calls.length;
    const first = store.set(refreshWallpaperInfoAtom);
    const second = store.set(refreshWallpaperInfoAtom);

    release();
    await Promise.all([first, second]);

    expect(vi.mocked(services.getWallpaperInfo).mock.calls).toHaveLength(callsBefore + 1);
    expect(store.get(wallpaperInfoLoadingAtom)).toBe(false);
  });

  it("markThumbStatusAtom records load state and ignores duplicate marks", () => {
    expect(store.get(thumbStatusAtom)["asset://thumb.jpg"]).toBeUndefined();

    store.set(markThumbStatusAtom, { src: "asset://thumb.jpg", status: "loaded" });
    expect(store.get(thumbStatusAtom)["asset://thumb.jpg"]).toBe("loaded");

    store.set(markThumbStatusAtom, { src: "asset://thumb.jpg", status: "loaded" });
    expect(store.get(thumbStatusAtom)["asset://thumb.jpg"]).toBe("loaded");

    store.set(markThumbStatusAtom, { src: "asset://broken.jpg", status: "error" });
    expect(store.get(thumbStatusAtom)["asset://broken.jpg"]).toBe("error");
    expect(store.get(thumbStatusAtom)["asset://thumb.jpg"]).toBe("loaded");
  });

  it("fetchNewWallpaperAtom refreshes info and busts image caches on success", async () => {
    vi.mocked(services.ensureWallpaperThumbs).mockResolvedValue({ generated: 0, total: 2 });
    const versionBefore = store.get(wallpaperThumbsVersionAtom);

    const success = await store.set(fetchNewWallpaperAtom);
    expect(success).toBe(true);
    expect(services.runScript).toHaveBeenCalledWith("fetch-wallpaper");
    // Even when ensure generated nothing (same-path in-place overwrite), the
    // version must advance so unchanged URLs reload fresh bytes.
    expect(store.get(wallpaperThumbsVersionAtom)).toBe(versionBefore + 1);
    expect(store.get(wallpaperInfoLoadingAtom)).toBe(false);
  });

  it("fetchNewWallpaperAtom returns false and keeps version when the script fails", async () => {
    const versionBefore = store.get(wallpaperThumbsVersionAtom);
    vi.mocked(services.runScript).mockResolvedValueOnce(false);

    const success = await store.set(fetchNewWallpaperAtom);
    expect(success).toBe(false);
    expect(store.get(wallpaperThumbsVersionAtom)).toBe(versionBefore);
  });
});
