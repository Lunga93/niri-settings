import { useAtom, useSetAtom } from "jotai";
import { motion } from "framer-motion";
import { Shapes, MousePointer, CheckCircle2 } from "lucide-react";
import SettingsGroup from "@/components/settings/SettingsGroup";
import SettingsRow from "@/components/settings/SettingsRow";
import { iconsAtom, setIconThemeAtom, setCursorThemeAtom, setCursorSizeAtom } from "@/lib/atoms";
import React from "react";

const ICON_THEMES = [
  { id: "Papirus", label: "Papirus", desc: "Clean, colorful Material vector icon pack" },
  { id: "Tela", label: "Tela", desc: "Modern flat circular & rounded icon family" },
  { id: "Colloid", label: "Colloid", desc: "Vibrant minimalist pastel icon suite" },
  { id: "Papirus-Dark", label: "Papirus Dark", desc: "Optimized for dark desktop surfaces" },
  { id: "WhiteSur", label: "WhiteSur", desc: "macOS inspired polished vector icons" },
] as const;

const CURSOR_THEMES = [
  { id: "Capitaine", label: "Capitaine", desc: "Smooth rounded pointer with soft shadows" },
  { id: "Breeze", label: "Breeze", desc: "KDE Breeze crisp precision cursor set" },
  { id: "Adwaita", label: "Adwaita", desc: "Default GNOME system pointer design" },
  { id: "Numix", label: "Numix", desc: "Sharp geometric high-contrast cursor" },
  { id: "WhiteSur", label: "WhiteSur", desc: "Polished macOS glass styled pointer" },
] as const;

const CURSOR_SIZES = [16, 20, 24, 28, 32, 36, 48] as const;

const IconsPage = (): React.JSX.Element => {
  const [icons] = useAtom(iconsAtom);
  const setIconTheme = useSetAtom(setIconThemeAtom);
  const setCursorTheme = useSetAtom(setCursorThemeAtom);
  const setCursorSize = useSetAtom(setCursorSizeAtom);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="px-7 pt-6 pb-2">
          <h1 className="text-[24px] font-bold text-text-header tracking-tight">Icons & Cursor</h1>
          <p className="text-[12px] text-text-subtitle mt-0.5">
            System icon themes, cursor pointer appearance, and scaling.
          </p>
        </div>

        <div className="flex flex-col gap-6 p-7">
          {/* ── ICON THEME SECTION ── */}
          <SettingsGroup header="Icon Theme" accent="var(--color-accent)">
            <div className="p-4 bg-surface-elevated">
              <div className="mb-2 text-[11px] font-semibold text-text-subtitle uppercase tracking-wider">
                System Icon Family
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {ICON_THEMES.map((theme) => {
                  const isSelected = icons.icon_theme === theme.id;
                  return (
                    <motion.button
                      key={theme.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={(): void => setIconTheme(theme.id)}
                      className={`relative flex items-start gap-3 rounded-xl p-3.5 border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-accent/15 border-accent shadow-sm"
                          : "bg-surface-active/40 border-border hover:bg-surface-hover hover:border-border-strong"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          isSelected
                            ? "bg-accent text-white shadow-sm"
                            : "bg-surface-elevated text-text-subtitle"
                        }`}
                      >
                        <Shapes size={18} />
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="text-[13px] font-semibold text-text-header">
                          {theme.label}
                        </div>
                        <div className="text-[11px] text-text-subtitle mt-0.5 truncate">
                          {theme.desc}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="absolute top-3.5 right-3 text-accent">
                          <CheckCircle2 size={16} />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </SettingsGroup>

          {/* ── CURSOR THEME & SIZE SECTION ── */}
          <SettingsGroup header="Cursor Pointer" accent="#bf5af2">
            <div className="p-4 bg-surface-elevated">
              <div className="mb-2 text-[11px] font-semibold text-text-subtitle uppercase tracking-wider">
                Cursor Theme
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {CURSOR_THEMES.map((theme) => {
                  const isSelected = icons.cursor_theme === theme.id;
                  return (
                    <motion.button
                      key={theme.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={(): void => setCursorTheme(theme.id)}
                      className={`relative flex items-start gap-3 rounded-xl p-3.5 border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#bf5af2]/15 border-[#bf5af2] shadow-sm"
                          : "bg-surface-active/40 border-border hover:bg-surface-hover hover:border-border-strong"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          isSelected
                            ? "bg-[#bf5af2] text-white shadow-sm"
                            : "bg-surface-elevated text-text-subtitle"
                        }`}
                      >
                        <MousePointer size={18} />
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="text-[13px] font-semibold text-text-header">
                          {theme.label}
                        </div>
                        <div className="text-[11px] text-text-subtitle mt-0.5 truncate">
                          {theme.desc}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="absolute top-3.5 right-3 text-[#bf5af2]">
                          <CheckCircle2 size={16} />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <SettingsRow
              title="Pointer Size"
              description="Mouse pointer size rendered on screen in logical pixels."
            >
              <div className="flex items-center gap-2">
                {CURSOR_SIZES.map((size) => (
                  <motion.button
                    key={size}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={(): void => setCursorSize(size)}
                    className={`
                      h-8 min-w-9 rounded-lg text-[11px] font-bold border transition-all cursor-pointer
                      ${
                        icons.cursor_size === size
                          ? "border-[#bf5af2] bg-[#bf5af2]/20 text-[#bf5af2] shadow-sm"
                          : "border-border bg-surface-active text-text-subtitle hover:bg-surface-hover hover:text-text-header"
                      }
                    `}
                  >
                    {size}
                  </motion.button>
                ))}
              </div>
            </SettingsRow>
          </SettingsGroup>
        </div>
      </motion.div>
    </div>
  );
};

export default IconsPage;
