import React, { useState, useEffect, useCallback } from "react";
import { useAtom, useSetAtom } from "jotai";
import { motion } from "framer-motion";
import { Folder, Globe, RefreshCw, MoreHorizontal, Layers, Check, Compass } from "lucide-react";
import ToggleSwitch from "@/components/settings/ToggleSwitch";
import {
  wallpaperAtom,
  appearanceAtom,
  wallpaperInfoAtom,
  wallpaperInfoLoadingAtom,
  refreshWallpaperInfoAtom,
  setWallpaperFrequencyAtom,
  setWallpaperSkipTodayAtom,
  setWallpaperMoodAtom,
  toggleWallpaperSourceAtom,
  setAccentModeAtom,
  setAccentColorAtom,
  setAccentSecondaryAtom,
} from "@/lib/atoms";
import { execScript } from "@/lib/sidecar";
import { logger } from "@/lib/logger";

const PRIMARY_PALETTE = [
  "#e57b54",
  "#e6a15c",
  "#bf5af2",
  "#ff453a",
  "#0a84ff",
  "#30d158",
  "#ffd60a",
  "#64d2ff",
  "#d6cfc4",
  "#8a8175",
] as const;

const SECONDARY_PALETTE = [
  "#8a8175",
  "#d6cfc4",
  "#e57b54",
  "#e6a15c",
  "#64d2ff",
  "#0a84ff",
  "#bf5af2",
  "#30d158",
  "#e0caa8",
  "#ffffff",
] as const;

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

const WallpaperPage = (): React.JSX.Element => {
  const [wallpaper] = useAtom(wallpaperAtom);
  const [appearance] = useAtom(appearanceAtom);
  const [info] = useAtom(wallpaperInfoAtom);
  const [loadingInfo] = useAtom(wallpaperInfoLoadingAtom);

  const refreshInfo = useSetAtom(refreshWallpaperInfoAtom);
  const setFrequency = useSetAtom(setWallpaperFrequencyAtom);
  const setSkipToday = useSetAtom(setWallpaperSkipTodayAtom);
  const setMood = useSetAtom(setWallpaperMoodAtom);
  const toggleSource = useSetAtom(toggleWallpaperSourceAtom);
  const setAccentMode = useSetAtom(setAccentModeAtom);
  const setPrimaryColor = useSetAtom(setAccentColorAtom);
  const setSecondaryColor = useSetAtom(setAccentSecondaryAtom);

  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    void refreshInfo();
  }, [refreshInfo]);

  const handleFetchNow = useCallback(async (): Promise<void> => {
    setFetching(true);
    try {
      await execScript("~/.local/bin/fetch-wallpaper");
      await refreshInfo();
    } catch (err) {
      logger.error("Failed to fetch wallpaper", err);
    } finally {
      setFetching(false);
    }
  }, [refreshInfo]);

  const selectedMood = wallpaper.selected_mood?.toLowerCase() ?? null;
  const moodCount = selectedMood ? (info.mood_counts[selectedMood] ?? 0) : info.total_scanned || 0;

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

        {/* Top Grid: Preview & Color Scheme */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Wallpaper Preview Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface-elevated p-4 overflow-hidden relative min-h-[220px]">
            <div className="flex items-center justify-between z-10 mb-3">
              <span className="flex items-center gap-1.5 rounded-full bg-surface-active/80 px-3 py-1 text-[11px] font-semibold tracking-wide text-text-body backdrop-blur-md uppercase">
                <Compass size={12} className="text-accent" />
                Browsing
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
            <div className="relative flex-1 w-full min-h-[140px] rounded-xl overflow-hidden border border-border/60 bg-surface-active/50 flex items-center justify-center">
              {info.image_base64 ? (
                <img
                  src={info.image_base64}
                  alt="Current Wallpaper"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-text-muted">
                  <Layers size={28} className="opacity-40" />
                  <span className="text-[12px]">
                    {loadingInfo ? "Loading preview..." : "No wallpaper preview"}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

              {/* Wallpaper Count Badge */}
              <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-md bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                <span>
                  {moodCount} {moodCount === 1 ? "wallpaper" : "wallpapers"}
                </span>
              </div>
            </div>
          </div>

          {/* Color Scheme Card */}
          <div className="rounded-2xl border border-border bg-surface-elevated p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12px] font-bold text-text-subtitle tracking-wider uppercase">
                Color Scheme
              </span>

              <div className="flex rounded-xl bg-surface-active p-0.5 border border-border">
                <button
                  onClick={(): void => setAccentMode("dynamic")}
                  className={`rounded-lg px-3 py-1 text-[11px] font-medium transition-all cursor-pointer ${
                    appearance.accent_mode === "dynamic"
                      ? "bg-surface-hover text-text-header shadow-sm"
                      : "text-text-subtitle hover:text-text-body"
                  }`}
                >
                  Dynamic
                </button>
                <button
                  onClick={(): void => setAccentMode("manual")}
                  className={`rounded-lg px-3 py-1 text-[11px] font-medium transition-all cursor-pointer ${
                    appearance.accent_mode === "manual"
                      ? "bg-surface-hover text-text-header shadow-sm"
                      : "text-text-subtitle hover:text-text-body"
                  }`}
                >
                  Manual
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* Primary Palette */}
              <div>
                <div className="text-[11px] font-semibold text-text-subtitle mb-2 tracking-wide uppercase">
                  Primary
                </div>
                <div className="flex items-center justify-between gap-1.5 overflow-x-auto py-1">
                  {PRIMARY_PALETTE.map((color) => {
                    const isSelected =
                      appearance.manual_primary?.toLowerCase() === color.toLowerCase();
                    return (
                      <button
                        key={color}
                        onClick={(): void => setPrimaryColor(color)}
                        className={`relative h-6.5 w-6.5 rounded-full cursor-pointer transition-transform hover:scale-110 shrink-0 ${
                          isSelected
                            ? "ring-2 ring-white ring-offset-2 ring-offset-surface-elevated"
                            : ""
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {isSelected && (
                          <Check size={12} className="mx-auto text-white drop-shadow-md" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Secondary Palette */}
              <div>
                <div className="text-[11px] font-semibold text-text-subtitle mb-2 tracking-wide uppercase">
                  Secondary
                </div>
                <div className="flex items-center justify-between gap-1.5 overflow-x-auto py-1">
                  {SECONDARY_PALETTE.map((color) => {
                    const isSelected =
                      appearance.manual_secondary?.toLowerCase() === color.toLowerCase();
                    return (
                      <button
                        key={color}
                        onClick={(): void => setSecondaryColor(color)}
                        className={`relative h-6.5 w-6.5 rounded-full cursor-pointer transition-transform hover:scale-110 shrink-0 ${
                          isSelected
                            ? "ring-2 ring-white ring-offset-2 ring-offset-surface-elevated"
                            : ""
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {isSelected && (
                          <Check size={12} className="mx-auto text-white drop-shadow-md" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Moods Section */}
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
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
                    flex flex-col items-center justify-center p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden min-h-[95px]
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
              {info.total_scanned > 0
                ? `${info.total_scanned} total wallpapers indexed`
                : "Scanning local library..."}
            </span>
          </div>
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
                  <select
                    value={wallpaper.frequency}
                    onChange={(e): void => setFrequency(e.target.value)}
                    className="rounded-xl border border-border bg-surface-active px-3 py-1.5 text-[12px] font-medium text-text-body cursor-pointer hover:bg-surface-hover transition-colors"
                  >
                    <option value="daily">Daily</option>
                    <option value="hourly">Hourly</option>
                    <option value="startup">On startup</option>
                    <option value="never">Never</option>
                  </select>
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
