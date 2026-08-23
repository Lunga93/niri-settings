import { useAtom, useSetAtom } from "jotai";
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, RotateCcw, Loader2 } from "lucide-react";
import SettingsGroup from "@/components/settings/SettingsGroup";
import SettingsRow from "@/components/settings/SettingsRow";
import {
  iconsAtom,
  setIconThemeAtom,
  setCursorThemeAtom,
  setCursorSizeAtom,
  gsettingErrorAtom,
  iconsBackupAtom,
  restoreIconsBackupAtom,
} from "@/stores";
import { listDesktopThemes } from "@/lib/services";
import type { DesktopTheme, DesktopThemes } from "@/lib/schemas";

const CURSOR_SIZES = [16, 20, 24, 28, 32, 36, 48] as const;

interface ThemeOption {
  id: string;
  label: string;
  installed: boolean;
}

// Merge the live scan with the persisted selection so a theme that was
// uninstalled since it was chosen still shows (flagged) instead of vanishing.
const buildOptions = (installed: DesktopTheme[], currentId: string): ThemeOption[] => {
  const options: ThemeOption[] = installed.map((t) => ({
    id: t.id,
    label: t.label,
    installed: true,
  }));
  if (currentId && !options.some((o) => o.id === currentId)) {
    options.push({ id: currentId, label: currentId, installed: false });
  }
  return options;
};

interface ThemeGridProps {
  title: string;
  options: ThemeOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const ThemeGrid = ({ title, options, selectedId, onSelect }: ThemeGridProps): React.JSX.Element => (
  <div className="p-4 bg-surface-elevated">
    <div className="mb-2 text-[11px] font-semibold text-text-subtitle uppercase tracking-wider">
      {title}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
      {options.map((theme) => {
        const isSelected = selectedId === theme.id;
        return (
          <motion.button
            key={theme.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={(): void => onSelect(theme.id)}
            className={`relative flex items-start gap-3 rounded-xl p-3.5 border text-left transition-all cursor-pointer ${
              isSelected
                ? "bg-accent/15 border-accent shadow-sm"
                : "bg-surface-active/40 border-border hover:bg-surface-hover hover:border-border-strong"
            }`}
          >
            <div className="flex-1 min-w-0 pr-4">
              <div className="text-[13px] font-semibold text-text-header">{theme.label}</div>
              <div className="text-[11px] mt-0.5 truncate">
                {theme.installed ? (
                  <span className="text-text-subtitle">Installed</span>
                ) : (
                  <span className="flex items-center gap-1 text-warning">
                    <AlertTriangle size={10} /> Not installed
                  </span>
                )}
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
);

const IconsPage = (): React.JSX.Element => {
  const [icons] = useAtom(iconsAtom);
  const [gsettingError] = useAtom(gsettingErrorAtom);
  const [backup] = useAtom(iconsBackupAtom);
  const setIconTheme = useSetAtom(setIconThemeAtom);
  const setCursorTheme = useSetAtom(setCursorThemeAtom);
  const setCursorSize = useSetAtom(setCursorSizeAtom);
  const restoreBackup = useSetAtom(restoreIconsBackupAtom);

  const [themes, setThemes] = useState<DesktopThemes | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void listDesktopThemes().then((result) => {
      if (cancelled) return;
      if (result) setThemes(result);
      else setLoadFailed(true);
    });
    return (): void => {
      cancelled = true;
    };
  }, []);

  const iconOptions = useMemo(
    () => buildOptions(themes?.icon_themes ?? [], icons.icon_theme),
    [themes, icons.icon_theme],
  );
  const cursorOptions = useMemo(
    () => buildOptions(themes?.cursor_themes ?? [], icons.cursor_theme),
    [themes, icons.cursor_theme],
  );

  const hasBackup = Boolean(backup.icon_theme || backup.cursor_theme);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="px-7 pt-6 pb-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-bold text-text-header tracking-tight">
              Icons & Cursor
            </h1>
            <p className="text-[12px] text-text-subtitle mt-0.5">
              System icon themes, cursor pointer appearance, and scaling.
            </p>
          </div>
          {hasBackup && (
            <button
              onClick={restoreBackup}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface-elevated px-3 py-1.5 text-[11px] font-medium text-text-body hover:bg-surface-hover cursor-pointer"
            >
              <RotateCcw size={13} />
              Restore original{backup.icon_theme ? ` (${backup.icon_theme})` : ""}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-6 p-7 pt-2">
          {!themes && !loadFailed && (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface-elevated p-5 text-[12px] text-text-subtitle">
              <Loader2 size={14} className="animate-spin" />
              Scanning installed themes…
            </div>
          )}
          {loadFailed && (
            <div className="flex items-center gap-2 rounded-2xl border border-warn/30 bg-warn/10 p-4 text-[12px] text-text-body">
              <AlertTriangle size={14} className="text-warn" />
              Could not scan installed themes — showing only your current selection.
            </div>
          )}
          {gsettingError && (
            <div className="flex items-center gap-2 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-[12px] text-text-body">
              <AlertTriangle size={14} className="text-danger" />
              {gsettingError}
            </div>
          )}

          {/* ── ICON THEME SECTION ── */}
          <SettingsGroup header="Icon Theme" accent="var(--color-accent)">
            <ThemeGrid
              title="System Icon Family"
              options={iconOptions}
              selectedId={icons.icon_theme}
              onSelect={setIconTheme}
            />
            <div className="px-4 py-2.5 text-[11px] text-text-subtitle">
              Applies to newly opened apps — running apps pick up the theme when relaunched.
            </div>
          </SettingsGroup>

          {/* ── CURSOR THEME & SIZE SECTION ── */}
          <SettingsGroup header="Cursor Pointer" accent="#bf5af2">
            <ThemeGrid
              title="Cursor Theme"
              options={cursorOptions}
              selectedId={icons.cursor_theme}
              onSelect={setCursorTheme}
            />

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
            <div className="px-4 py-2.5 text-[11px] text-text-subtitle">
              Cursor changes apply to niri immediately and to newly opened apps.
            </div>
          </SettingsGroup>
        </div>
      </motion.div>
    </div>
  );
};

export default IconsPage;
