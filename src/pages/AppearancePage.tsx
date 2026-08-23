import { useAtom, useSetAtom } from "jotai";
import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Sun, Moon, Check, RefreshCw, Loader2 } from "lucide-react";
import SettingsGroup from "@/components/settings/SettingsGroup";
import SettingsRow from "@/components/settings/SettingsRow";
import {
  appearanceAtom,
  setColorSchemeAtom,
  setAccentColorAtom,
  setAccentModeAtom,
  pywalThemeAtom,
  themeLoadingAtom,
  loadThemeColorsAtom,
  deriveThemeTokens,
} from "@/stores";

const CURATED_ACCENTS = [
  "#0a84ff", // Blue
  "#5e5ce6", // Indigo
  "#bf5af2", // Purple
  "#ff375f", // Pink
  "#ff453a", // Red
  "#ff9f0a", // Orange
  "#ffd60a", // Yellow
  "#30d158", // Green
  "#00c7be", // Teal
  "#64d2ff", // Cyan
] as const;

const AppearancePage = (): React.JSX.Element => {
  const [appearance] = useAtom(appearanceAtom);
  const setColorScheme = useSetAtom(setColorSchemeAtom);
  const setAccentColor = useSetAtom(setAccentColorAtom);
  const setAccentMode = useSetAtom(setAccentModeAtom);

  const [pywalTheme] = useAtom(pywalThemeAtom);
  const [themeLoading] = useAtom(themeLoadingAtom);
  const reloadTheme = useSetAtom(loadThemeColorsAtom);

  // Extract unique pywal palette colors
  const pywalColors: string[] = [];
  if (pywalTheme.primary_accent) pywalColors.push(pywalTheme.primary_accent);
  if (pywalTheme.secondary_accent && !pywalColors.includes(pywalTheme.secondary_accent)) {
    pywalColors.push(pywalTheme.secondary_accent);
  }
  Object.values(pywalTheme.colors || {}).forEach((c) => {
    if (c && c.startsWith("#") && !pywalColors.includes(c)) {
      pywalColors.push(c);
    }
  });

  const tokens = deriveThemeTokens(pywalTheme, appearance);
  const palette = [
    { role: "Background", hex: tokens.window },
    { role: "Sidebar", hex: tokens.sidebar },
    { role: "Card", hex: tokens.elevated },
    { role: "Text", hex: tokens.textHeader },
    { role: "Secondary", hex: tokens.textSubtitle },
    { role: "Accent", hex: tokens.accent },
    { role: "Border", hex: tokens.border },
  ];

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between px-7 pt-6 pb-2">
          <div>
            <h1 className="text-[24px] font-bold text-text-header tracking-tight">Appearance</h1>
            <p className="text-[12px] text-text-subtitle mt-0.5">
              Pywal color schemes, accent palettes, and visual desktop styles.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(): void => {
              void reloadTheme();
            }}
            disabled={themeLoading}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-elevated px-3 py-1.5 text-[11px] font-medium text-text-body hover:bg-surface-hover cursor-pointer"
          >
            <RefreshCw size={13} className={themeLoading ? "animate-spin text-accent" : ""} />
            <span>Reload Pywal</span>
          </motion.button>
        </div>

        <div className="flex flex-col gap-6 p-7">
          {/* ── ACTIVE PALETTE — the exact tokens applied to this window ── */}
          <div className="rounded-2xl border border-border bg-surface-elevated p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-accent" />
                <span className="text-[12px] font-semibold text-text-header">Active Palette</span>
              </div>
              <span className="text-[11px] text-text-subtitle">
                {tokens.isLight ? "Light" : "Dark"} ·{" "}
                {appearance.accent_mode === "manual"
                  ? `manual accent ${tokens.accent}`
                  : `pywal accent ${tokens.accent}`}
              </span>
            </div>

            <div className="flex flex-wrap gap-2.5 items-center">
              {palette.map((entry) => (
                <div
                  key={entry.role}
                  title={`${entry.role} ${entry.hex}`}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className="h-10 w-10 rounded-xl border border-border shadow-sm"
                    style={{ backgroundColor: entry.hex }}
                  />
                  <span className="text-[9px] text-text-subtitle">{entry.role}</span>
                </div>
              ))}
            </div>

            {/* Sample surface rendered with the real token values */}
            <div
              className="rounded-xl border border-border p-3 flex items-center justify-between"
              style={{ backgroundColor: tokens.elevated }}
            >
              <span className="text-[12px]" style={{ color: tokens.textHeader }}>
                Header text
              </span>
              <span className="text-[11px]" style={{ color: tokens.textSubtitle }}>
                Subtitle text
              </span>
              <span
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white"
                style={{ backgroundColor: tokens.accent }}
              >
                Accent button
              </span>
            </div>

            {themeLoading && (
              <div className="flex items-center gap-1.5 text-[11px] text-text-subtitle">
                <Loader2 size={11} className="animate-spin" />
                Regenerating pywal palette…
              </div>
            )}
          </div>

          {/* ── THEME MODE SECTION ── */}
          <SettingsGroup header="Theme Mode" accent="var(--color-accent)">
            <SettingsRow
              title="System Appearance"
              description="Switch between dark and light themes for all shell components and apps."
            >
              <div className="flex gap-2">
                {(["dark", "light"] as const).map((scheme) => {
                  const isSelected = appearance.color_scheme === scheme;
                  const Icon = scheme === "dark" ? Moon : Sun;
                  return (
                    <motion.button
                      key={scheme}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={(): void => {
                        void setColorScheme(scheme);
                      }}
                      className={`
                        flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-medium border transition-all cursor-pointer
                        ${
                          isSelected
                            ? "border-accent bg-accent/20 text-accent font-semibold shadow-sm"
                            : "border-border bg-surface-active/50 text-text-subtitle hover:bg-surface-hover"
                        }
                      `}
                    >
                      <Icon size={14} />
                      <span className="capitalize">{scheme}</span>
                    </motion.button>
                  );
                })}
              </div>
            </SettingsRow>
          </SettingsGroup>

          {/* ── ACCENT MODE SECTION ── */}
          <SettingsGroup header="Accent Mode & Palette" accent="#bf5af2">
            <SettingsRow
              title="Color Selection Mode"
              description="Dynamic extracts vibrant accents from pywal wallpaper; Manual uses a selected color."
            >
              <div className="flex gap-2">
                {(["dynamic", "manual"] as const).map((mode) => {
                  const isSelected = appearance.accent_mode === mode;
                  return (
                    <motion.button
                      key={mode}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={(): void => {
                        void setAccentMode(mode);
                      }}
                      className={`
                        rounded-xl px-4 py-2 text-[12px] font-medium border transition-all cursor-pointer
                        ${
                          isSelected
                            ? "border-accent bg-accent/20 text-accent font-semibold shadow-sm"
                            : "border-border bg-surface-active/50 text-text-subtitle hover:bg-surface-hover"
                        }
                      `}
                    >
                      {mode === "dynamic" ? "Pywal Dynamic" : "Manual Palette"}
                    </motion.button>
                  );
                })}
              </div>
            </SettingsRow>

            {/* Pywal Extracted Palette Swatches */}
            <div className="p-4 bg-surface-elevated flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-subtitle">
                  Pywal Extracted Swatches
                </span>
                <span className="text-[10px] text-text-muted">Derived from current wallpaper</span>
              </div>

              <div className="flex flex-wrap gap-2.5 items-center">
                {pywalColors.map((color) => {
                  const isSelected = tokens.accent.toLowerCase() === color.toLowerCase();
                  return (
                    <motion.button
                      key={color}
                      whileHover={{ scale: 1.18 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(): void => {
                        void setAccentColor(color);
                      }}
                      title={color}
                      className={`
                        relative h-7 w-7 rounded-full cursor-pointer transition-all flex items-center justify-center shadow-sm
                        ${
                          isSelected
                            ? "ring-2 ring-white ring-offset-2 ring-offset-surface-elevated scale-110"
                            : "opacity-85 hover:opacity-100 hover:ring-1 hover:ring-white/40"
                        }
                      `}
                      style={{ backgroundColor: color }}
                    >
                      {isSelected && <Check size={13} className="text-white drop-shadow-sm" />}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Curated Accent Palette Swatches */}
            <div className="p-4 border-t border-border bg-surface-elevated flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-subtitle">
                  Standard Accent Presets
                </span>
                <span className="text-[10px] text-text-muted">High-contrast solid accents</span>
              </div>

              <div className="flex flex-wrap gap-2.5 items-center">
                {CURATED_ACCENTS.map((color) => {
                  const isSelected = tokens.accent.toLowerCase() === color.toLowerCase();
                  return (
                    <motion.button
                      key={color}
                      whileHover={{ scale: 1.18 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(): void => {
                        void setAccentColor(color);
                      }}
                      title={color}
                      className={`
                        relative h-7 w-7 rounded-full cursor-pointer transition-all flex items-center justify-center shadow-sm
                        ${
                          isSelected
                            ? "ring-2 ring-white ring-offset-2 ring-offset-surface-elevated scale-110"
                            : "opacity-85 hover:opacity-100 hover:ring-1 hover:ring-white/40"
                        }
                      `}
                      style={{ backgroundColor: color }}
                    >
                      {isSelected && <Check size={13} className="text-white drop-shadow-sm" />}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </SettingsGroup>
        </div>
      </motion.div>
    </div>
  );
};

export default AppearancePage;
