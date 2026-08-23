import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder,
  Globe,
  RefreshCw,
  MoreHorizontal,
  Layers,
  Compass,
  Check,
  Image as ImageIcon,
  AlertCircle,
  X,
} from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import ToggleSwitch from "@/components/settings/ToggleSwitch";
import Dropdown, { type DropdownOption } from "@/components/settings/Dropdown";
import {
  wallpaperAtom,
  wallpaperInfoAtom,
  wallpaperInfoLoadingAtom,
  wallpaperInfoErrorAtom,
  refreshWallpaperInfoAtom,
  setWallpaperFrequencyAtom,
  setWallpaperSkipTodayAtom,
  setWallpaperMoodAtom,
  toggleWallpaperSourceAtom,
  filteredWallpapersAtom,
  wallpaperApplyingAtom,
  wallpaperApplyErrorAtom,
  applyWallpaperAtom,
  wallpaperThumbsVersionAtom,
  galleryVisibleCountAtom,
  thumbStatusAtom,
  markThumbStatusAtom,
  fetchNewWallpaperAtom,
} from "@/stores";
import type { WallpaperItem } from "@/lib/schemas/wallpaper";
import { execScript } from "@/lib/ipc";

interface MoodConfig {
  readonly id: string;
  readonly label: string;
  readonly bgClass: string;
  readonly accentClass: string;
  readonly dotColor: string;
}

const MOODS: readonly MoodConfig[] = [
  {
    id: "dark",
    label: "Dark",
    bgClass: "bg-[#25201b]",
    accentClass: "border-[#3d342c]",
    dotColor: "bg-[#5c5044]",
  },
  {
    id: "light",
    label: "Light",
    bgClass: "bg-[#524b42]",
    accentClass: "border-[#6b6257]",
    dotColor: "bg-[#8a8073]",
  },
  {
    id: "warm",
    label: "Warm",
    bgClass: "bg-[#5e3820]",
    accentClass: "border-[#7e4b2a]",
    dotColor: "bg-[#e57b54]",
  },
  {
    id: "cool",
    label: "Cool",
    bgClass: "bg-[#203657]",
    accentClass: "border-[#2c4b78]",
    dotColor: "bg-[#4f80c2]",
  },
  {
    id: "sky",
    label: "Sky",
    bgClass: "bg-[#214859]",
    accentClass: "border-[#2d627a]",
    dotColor: "bg-[#58a7cc]",
  },
  {
    id: "earth",
    label: "Earth",
    bgClass: "bg-[#453424]",
    accentClass: "border-[#684e36]",
    dotColor: "bg-[#a9835a]",
  },
];

interface SourceItem {
  readonly key: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly isFolder?: boolean;
}

const SOURCES: readonly SourceItem[] = [
  { key: "local", title: "Local Folder", subtitle: "~/Pictures/wallpapers", isFolder: true },
  { key: "unsplash", title: "Unsplash" },
  { key: "wallhaven", title: "Wallhaven" },
  { key: "pexels", title: "Pexels" },
  { key: "bing", title: "Bing" },
  { key: "picsum", title: "Picsum" },
];

const FREQUENCY_OPTIONS: readonly DropdownOption[] = [
  { value: "daily", label: "Daily", description: "Fetch every 24 hours" },
  { value: "hourly", label: "Hourly", description: "Fetch every 60 minutes" },
  { value: "startup", label: "On startup", description: "Fetch when logging in" },
  { value: "never", label: "Never", description: "Manual fetching only" },
];

const resolveWallpaperUrl = (filePath: string): string => {
  if (!filePath) return "";
  if (
    filePath.startsWith("data:") ||
    filePath.startsWith("http://") ||
    filePath.startsWith("https://") ||
    filePath.startsWith("asset://")
  ) {
    return filePath;
  }
  try {
    return convertFileSrc(filePath);
  } catch {
    return filePath;
  }
};

const MOOD_TAG_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  dark: { bg: "bg-[#25201b]/90", text: "text-white/90", dot: "bg-[#5c5044]" },
  light: { bg: "bg-[#524b42]/90", text: "text-white/90", dot: "bg-[#8a8073]" },
  warm: { bg: "bg-[#5e3820]/90", text: "text-white/90", dot: "bg-[#e57b54]" },
  cool: { bg: "bg-[#203657]/90", text: "text-white/90", dot: "bg-[#4f80c2]" },
  sky: { bg: "bg-[#214859]/90", text: "text-white/90", dot: "bg-[#58a7cc]" },
  earth: { bg: "bg-[#453424]/90", text: "text-white/90", dot: "bg-[#a9835a]" },
};

interface WallpaperCardProps {
  readonly item: WallpaperItem;
  readonly isActive: boolean;
  readonly isApplying: boolean;
  readonly thumbVersion: number;
  readonly onSelect: (item: WallpaperItem) => void;
}

const GRID_INITIAL_COUNT = 24;
const GRID_CHUNK = 24;

const WallpaperCard: React.FC<WallpaperCardProps> = ({
  item,
  isActive,
  isApplying,
  thumbVersion,
  onSelect,
}) => {
  const markThumbStatus = useSetAtom(markThumbStatusAtom);
  const statusBySrc = useAtomValue(thumbStatusAtom);

  const imageUrl = resolveWallpaperUrl(item.thumbnail);
  const versionedUrl = thumbVersion > 0 ? `${imageUrl}?v=${thumbVersion}` : imageUrl;

  // Cached images can finish loading before React attaches onLoad.
  const imgRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    const el = imgRef.current;
    if (!el || !el.complete) return;
    markThumbStatus({
      src: versionedUrl,
      status: el.naturalWidth > 0 ? "loaded" : "error",
    });
  }, [versionedUrl, markThumbStatus]);

  const imageLoaded = statusBySrc[versionedUrl] === "loaded";
  const imageError = statusBySrc[versionedUrl] === "error";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -3 }}
      onClick={(): void => onSelect(item)}
      className={`
        group relative flex flex-col rounded-2xl border overflow-hidden bg-surface-elevated cursor-pointer transition-all duration-200 select-none
        ${
          isActive
            ? "ring-2 ring-accent border-accent shadow-lg shadow-accent/15"
            : "border-border hover:border-white/25 hover:shadow-md"
        }
      `}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-16/10 w-full overflow-hidden bg-surface-active flex items-center justify-center">
        {/* Skeleton while image is loading */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-surface-active animate-pulse flex items-center justify-center">
            <ImageIcon size={22} className="text-text-muted opacity-40 animate-pulse" />
          </div>
        )}

        {/* Thumbnail Image */}
        {!imageError && imageUrl ? (
          <img
            ref={imgRef}
            src={versionedUrl}
            alt={item.name || item.filename}
            loading="lazy"
            decoding="async"
            onLoad={(): void => void markThumbStatus({ src: versionedUrl, status: "loaded" })}
            onError={(): void => void markThumbStatus({ src: versionedUrl, status: "error" })}
            className={`
              h-full w-full object-cover transition-all duration-300 group-hover:scale-105
              ${imageLoaded ? "opacity-100" : "opacity-0"}
            `}
          />
        ) : (
          <ImageIcon size={24} className="text-text-muted opacity-40" />
        )}

        {/* Active Badge (Top Left) */}
        {isActive && (
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white shadow-md backdrop-blur-md">
            <Check size={11} strokeWidth={3} />
            <span>Active</span>
          </div>
        )}

        {/* Applying Overlay */}
        {isApplying && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/70 backdrop-blur-xs">
            <RefreshCw size={20} className="animate-spin text-white" />
            <span className="text-[11px] font-semibold text-white tracking-wide">Applying...</span>
          </div>
        )}

        {/* Hover action overlay indicator (when not active and not applying) */}
        {!isActive && !isApplying && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <span className="rounded-xl bg-surface-window/90 border border-white/20 px-2.5 py-1 text-[11px] font-semibold text-white shadow backdrop-blur-md transform translate-y-1 group-hover:translate-y-0 transition-transform">
              Set wallpaper
            </span>
          </div>
        )}

        {/* Mood Tags (Top Right) */}
        {item.moods && item.moods.length > 0 && !isApplying && (
          <div className="absolute top-2.5 right-2.5 z-10 flex flex-wrap gap-1 justify-end max-w-[70%]">
            {item.moods.slice(0, 2).map((m) => {
              const moodKey = m.toLowerCase();
              const style = MOOD_TAG_STYLES[moodKey] ?? {
                bg: "bg-black/60",
                text: "text-white/90",
                dot: "bg-white/60",
              };
              return (
                <span
                  key={m}
                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider backdrop-blur-md ${style.bg} ${style.text}`}
                >
                  <span className={`h-1 w-1 rounded-full ${style.dot}`} />
                  {m}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const WallpaperPage = (): React.JSX.Element => {
  const [wallpaper] = useAtom(wallpaperAtom);
  const [info] = useAtom(wallpaperInfoAtom);
  const [loadingInfo] = useAtom(wallpaperInfoLoadingAtom);
  const [infoError, setInfoError] = useAtom(wallpaperInfoErrorAtom);
  const filteredWallpapers = useAtomValue(filteredWallpapersAtom);
  const [applying] = useAtom(wallpaperApplyingAtom);
  const [applyError, setApplyError] = useAtom(wallpaperApplyErrorAtom);

  const refreshInfo = useSetAtom(refreshWallpaperInfoAtom);
  const setFrequency = useSetAtom(setWallpaperFrequencyAtom);
  const setSkipToday = useSetAtom(setWallpaperSkipTodayAtom);
  const setMood = useSetAtom(setWallpaperMoodAtom);
  const toggleSource = useSetAtom(toggleWallpaperSourceAtom);
  const applyWallpaper = useSetAtom(applyWallpaperAtom);
  const fetchNewWallpaper = useSetAtom(fetchNewWallpaperAtom);

  const [fetching, setFetching] = useState(false);
  const [targetApplyingPath, setTargetApplyingPath] = useState<string | null>(null);
  const thumbsVersion = useAtomValue(wallpaperThumbsVersionAtom);
  // Reveal count lives in an atom so it survives navigating away and back.
  const [visibleCount, setVisibleCount] = useAtom(galleryVisibleCountAtom);
  const gridSentinelRef = useRef<HTMLDivElement | null>(null);
  const previousMoodRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const currentMood = wallpaper.selected_mood ?? null;
    if (previousMoodRef.current === undefined) {
      // First run after a remount: keep whatever the atom preserved.
      previousMoodRef.current = currentMood;
      return;
    }
    // Reveal window resets only when the mood filter actually changes,
    // not on refetches that merely produce a new array identity.
    if (previousMoodRef.current !== currentMood) {
      previousMoodRef.current = currentMood;
      setVisibleCount(GRID_INITIAL_COUNT);
      return;
    }
    // Keep the count valid if the library shrank under it.
    setVisibleCount((count) => Math.min(count, filteredWallpapers.length));
  }, [wallpaper.selected_mood, filteredWallpapers.length, setVisibleCount]);

  useEffect(() => {
    const el = gridSentinelRef.current;
    if (!el || visibleCount >= filteredWallpapers.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => Math.min(count + GRID_CHUNK, filteredWallpapers.length));
        }
      },
      { rootMargin: "800px" },
    );
    observer.observe(el);
    return (): void => observer.disconnect();
  }, [visibleCount, filteredWallpapers.length, setVisibleCount]);

  useEffect(() => {
    void refreshInfo();
  }, [refreshInfo]);

  const handleFetchNow = useCallback(async (): Promise<void> => {
    setFetching(true);
    try {
      await fetchNewWallpaper();
    } finally {
      setFetching(false);
    }
  }, [fetchNewWallpaper]);

  const handleApplyWallpaper = useCallback(
    async (item: WallpaperItem): Promise<void> => {
      setTargetApplyingPath(item.path);
      try {
        await applyWallpaper(item.path);
      } finally {
        setTargetApplyingPath(null);
      }
    },
    [applyWallpaper],
  );

  const selectedMood = wallpaper.selected_mood?.toLowerCase() ?? null;
  const moodCount = selectedMood
    ? (info.mood_counts[selectedMood] ?? filteredWallpapers.length)
    : info.total_scanned || filteredWallpapers.length || 0;

  const currentWallpaperItem = info.wallpapers?.find(
    (w) =>
      w.path === info.current_wallpaper ||
      (info.current_wallpaper &&
        (info.current_wallpaper.endsWith(`/${w.filename}`) ||
          info.current_wallpaper.endsWith(w.filename))),
  );

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-6 p-7"
      >
        {/* Page Header */}
        <div>
          <h1 className="text-[24px] font-bold text-text-header">Wallpaper</h1>
          <p className="text-[12px] text-text-subtitle mt-1">
            Browse by mood, schedule rotation, and manage sources.
          </p>
        </div>

        {/* Active Wallpaper Hero */}
        <section className="rounded-2xl border border-border bg-surface-elevated p-4 overflow-hidden relative min-h-80">
          <div className="flex items-center justify-between z-10 mb-3">
            <span className="flex items-center gap-1.5 rounded-full bg-surface-active/80 px-3 py-1 text-[11px] font-semibold tracking-wide text-text-body backdrop-blur-md uppercase">
              <Compass size={12} className="text-accent" />
              Current wallpaper
            </span>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={(): void => setMood(null)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1 text-[11px] font-medium transition-all cursor-pointer ${
                selectedMood === null
                  ? "border-accent/40 bg-accent/15 text-accent"
                  : "border-border bg-surface-active text-text-subtitle hover:bg-surface-hover hover:text-text-body"
              }`}
            >
              ← All wallpapers
            </motion.button>
          </div>

          {/* Preview Image / Fallback Container */}
          <div className="relative w-full min-h-60 rounded-xl overflow-hidden border border-border/60 bg-surface-active/50 flex items-center justify-center">
            {(() => {
              // Versioned like thumbs: fetch-wallpaper replaces daily.jpg in
              // place, leaving the URL unchanged.
              const heroBase = resolveWallpaperUrl(info.current_wallpaper);
              const heroUrl =
                heroBase && thumbsVersion > 0 ? `${heroBase}?v=${thumbsVersion}` : heroBase;
              return heroUrl ? (
                <img
                  src={heroUrl}
                  alt="Current Wallpaper"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-text-muted">
                  <Layers size={28} className="opacity-40" />
                  <span className="text-[12px]">
                    {loadingInfo ? "Loading preview..." : "No wallpaper preview"}
                  </span>
                </div>
              );
            })()}
            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

            {/* Wallpaper Count Badge */}
            <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                <span>
                  {moodCount} {moodCount === 1 ? "wallpaper" : "wallpapers"}
                </span>
              </div>
              {currentWallpaperItem && (
                <div className="max-w-[60%] truncate rounded-md bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">
                  {currentWallpaperItem.name || currentWallpaperItem.filename}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Moods Section */}
        <div className="flex flex-col gap-2.5">
          <div>
            <h2 className="text-[13px] font-bold tracking-wide text-text-header">Browse by mood</h2>
            <p className="mt-1 text-[11px] text-text-subtitle">
              Choose a category to narrow down your wallpaper collection.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {MOODS.map((mood) => {
              const isSelected = selectedMood === mood.id;
              const count = info.mood_counts[mood.id] ?? 0;
              return (
                <motion.button
                  key={mood.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(): void => setMood(isSelected ? null : mood.id)}
                  className={`
                    flex flex-col items-center justify-center p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden min-h-23.75
                    ${mood.bgClass}
                    ${
                      isSelected
                        ? "ring-2 ring-white/80 border-white/40 shadow-lg"
                        : "border-border hover:border-white/20"
                    }
                  `}
                >
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <span className="text-[13px] font-bold text-white tracking-wide">
                      {mood.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 mb-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${mood.dotColor}`} />
                    <span className={`h-1.5 w-1.5 rounded-full ${mood.dotColor}`} />
                    <span className={`h-1.5 w-1.5 rounded-full ${mood.dotColor}`} />
                  </div>

                  <span className="text-[10px] text-white/70 font-medium">
                    {count} {count === 1 ? "wallpaper" : "wallpapers"}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Mood Status Bar */}
          <div className="flex items-center justify-between px-1 text-[11px]">
            <span className="font-medium text-text-subtitle">
              {selectedMood
                ? `${selectedMood.charAt(0).toUpperCase() + selectedMood.slice(1)} wallpapers`
                : "All wallpapers"}
            </span>
            <span className="text-text-muted">
              {loadingInfo
                ? "Scanning local library..."
                : info.total_scanned > 0
                  ? `${info.total_scanned} total wallpapers indexed`
                  : "0 wallpapers indexed"}
            </span>
          </div>
        </div>

        {/* Gallery Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-bold tracking-wide text-text-header">
                {selectedMood
                  ? `${selectedMood.charAt(0).toUpperCase() + selectedMood.slice(1)} Wallpapers`
                  : "All Wallpapers"}
              </h2>
              <span className="rounded-full bg-surface-active px-2 py-0.5 text-[11px] font-semibold text-text-subtitle">
                {filteredWallpapers.length}
              </span>
            </div>

            {selectedMood !== null && (
              <button
                onClick={(): void => setMood(null)}
                className="text-[11px] font-medium text-accent hover:underline cursor-pointer"
              >
                Clear filter
              </button>
            )}
          </div>

          {/* Error Banner if wallpaper info load failed */}
          <AnimatePresence>
            {infoError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center justify-between gap-2 rounded-xl border border-danger/40 bg-danger-soft p-3 text-[12px] text-danger"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{infoError}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(): void => void refreshInfo()}
                    className="rounded-lg bg-danger/15 px-2 py-1 text-[11px] font-medium text-danger hover:bg-danger/25 cursor-pointer"
                  >
                    Retry
                  </button>
                  <button
                    onClick={(): void => setInfoError(null)}
                    className="p-1 text-danger/80 hover:text-danger cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Banner if wallpaper application failed */}
          <AnimatePresence>
            {applyError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center justify-between gap-2 rounded-xl border border-danger/40 bg-danger-soft p-3 text-[12px] text-danger"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{applyError}</span>
                </div>
                <button
                  onClick={(): void => setApplyError(null)}
                  className="p-1 text-danger/80 hover:text-danger cursor-pointer"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading Skeletons */}
          {loadingInfo && filteredWallpapers.length === 0 && (
            <div className="grid grid-cols-3 gap-3.5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="aspect-16/10 rounded-2xl border border-border bg-surface-elevated/60 animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Wallpapers Grid */}
          {!loadingInfo && filteredWallpapers.length > 0 && (
            <div className="grid grid-cols-3 gap-3.5">
              {filteredWallpapers.slice(0, visibleCount).map((item) => {
                const isActive = Boolean(
                  info.current_wallpaper &&
                  item.path &&
                  (info.current_wallpaper === item.path ||
                    info.current_wallpaper.endsWith(`/${item.filename}`) ||
                    info.current_wallpaper.endsWith(item.filename)),
                );
                const isTargetApplying = applying && targetApplyingPath === item.path;

                return (
                  <WallpaperCard
                    key={item.path}
                    item={item}
                    isActive={isActive}
                    isApplying={isTargetApplying}
                    thumbVersion={thumbsVersion}
                    onSelect={handleApplyWallpaper}
                  />
                );
              })}
            </div>
          )}
          {!loadingInfo && visibleCount < filteredWallpapers.length && (
            <div ref={gridSentinelRef} className="h-1 w-full" aria-hidden="true" />
          )}

          {/* Empty State */}
          {!loadingInfo && filteredWallpapers.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-surface-elevated/40 p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-active text-text-muted">
                <ImageIcon size={24} className="opacity-60" />
              </div>
              <div>
                <h3 className="text-[13px] font-semibold text-text-header">No wallpapers found</h3>
                <p className="mt-1 text-[11px] text-text-subtitle max-w-sm">
                  {selectedMood
                    ? `No wallpapers categorized under the "${selectedMood}" mood were found in your library.`
                    : "No wallpapers found in ~/Pictures/wallpapers or indexed cache."}
                </p>
              </div>
              {selectedMood && (
                <button
                  onClick={(): void => setMood(null)}
                  className="rounded-xl border border-border bg-surface-active px-3 py-1.5 text-[11px] font-medium text-text-body hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  Show all wallpapers
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom Grid: Schedule & Sources */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Schedule Card */}
          <div className="rounded-2xl border border-border bg-surface-elevated p-5 flex flex-col justify-between gap-5">
            <div>
              <div className="text-[12px] font-bold text-text-subtitle mb-4 tracking-wider uppercase">
                Schedule
              </div>

              <div className="flex flex-col gap-4">
                {/* Frequency */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-medium text-text-header">Frequency</div>
                    <div className="text-[11px] text-text-subtitle">
                      How often to fetch a new wallpaper
                    </div>
                  </div>
                  <Dropdown
                    value={wallpaper.frequency}
                    options={FREQUENCY_OPTIONS}
                    onChange={(val): void => setFrequency(val)}
                  />
                </div>

                {/* Skip Today */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-medium text-text-header">Skip today</div>
                    <div className="text-[11px] text-text-subtitle">
                      Keep current wallpaper for the rest of today
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={wallpaper.skip_today || info.skip_today}
                    onToggle={setSkipToday}
                  />
                </div>
              </div>
            </div>

            {/* Fetch Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleFetchNow}
              disabled={fetching}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#e57b54] hover:bg-[#eb8c68] text-white py-2.5 text-[12px] font-semibold transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              <RefreshCw size={13} className={fetching ? "animate-spin" : ""} />
              {fetching ? "Fetching new wallpaper..." : "Fetch new wallpaper now"}
            </motion.button>
          </div>

          {/* Sources Card */}
          <div className="rounded-2xl border border-border bg-surface-elevated p-5 flex flex-col gap-3.5">
            <div className="text-[12px] font-bold text-text-subtitle mb-1 tracking-wider uppercase">
              Sources
            </div>

            <div className="flex flex-col gap-3">
              {SOURCES.map((src) => {
                const isEnabled = wallpaper.sources_enabled[src.key] ?? false;
                return (
                  <div key={src.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-active text-text-subtitle">
                        {src.isFolder ? <Folder size={14} /> : <Globe size={14} />}
                      </div>
                      <div>
                        <div className="text-[12px] font-medium text-text-header">{src.title}</div>
                        {src.subtitle && (
                          <div className="text-[10px] text-text-subtitle">{src.subtitle}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {src.isFolder && (
                        <button
                          onClick={(): void => {
                            void execScript("xdg-open ~/Pictures/wallpapers");
                          }}
                          title="Open wallpapers folder"
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface-active text-text-subtitle hover:bg-surface-hover hover:text-text-body transition-colors cursor-pointer"
                        >
                          <MoreHorizontal size={12} />
                        </button>
                      )}
                      <ToggleSwitch
                        checked={isEnabled}
                        onToggle={(): void => toggleSource(src.key)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default WallpaperPage;
