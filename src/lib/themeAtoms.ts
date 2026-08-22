import { atom } from "jotai";
import { PywalThemeSchema, type PywalTheme, type AppearanceSettings } from "./schemas";
import { getThemeColors } from "./services";
import { logger } from "./logger";
import { appearanceAtom } from "./atoms";

export const DEFAULT_PYWAL_THEME: PywalTheme = PywalThemeSchema.parse({});

export const pywalThemeAtom = atom<PywalTheme>(DEFAULT_PYWAL_THEME);
export const themeLoadingAtom = atom<boolean>(false);

/**
 * Converts a hex color (#RRGGBB) to rgba string with alpha.
 */
export const hexToRgba = (hex: string, alpha: number): string => {
  if (!hex || !hex.startsWith("#")) return `rgba(10, 132, 255, ${alpha})`;
  const clean = hex.replace("#", "");
  let r = 0,
    g = 0,
    b = 0;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length >= 6) {
    r = parseInt(clean.substring(0, 2), 16);
    g = parseInt(clean.substring(2, 4), 16);
    b = parseInt(clean.substring(4, 6), 16);
  }
  return `rgba(${isNaN(r) ? 10 : r}, ${isNaN(g) ? 132 : g}, ${isNaN(b) ? 255 : b}, ${alpha})`;
};

/**
 * Applies pywal theme colors directly to document.documentElement CSS variables.
 */
export const applyThemeToDOM = (theme: PywalTheme, appearance: AppearanceSettings): void => {
  if (typeof document === "undefined") return;

  const isLight = appearance.color_scheme === "light";
  const bg = theme.special.background || (isLight ? "#f5ede0" : "#12100e");
  const fg = theme.special.foreground || (isLight ? "#1a1611" : "#dfe4e9");

  // Determine active accent
  let accent = theme.primary_accent || theme.colors.color4 || "#0a84ff";
  if (appearance.accent_mode === "manual" && appearance.manual_primary) {
    accent = appearance.manual_primary;
  }

  const root = document.documentElement;

  // Background and surfaces
  root.style.setProperty("--color-surface-window", bg);
  root.style.setProperty("--color-surface-content", bg);
  root.style.setProperty("--color-surface-sidebar", isLight ? "#ede3d4" : adjustBrightness(bg, -8));
  root.style.setProperty("--color-surface-titlebar", isLight ? "#e5dbcc" : adjustBrightness(bg, 5));
  root.style.setProperty(
    "--color-surface-elevated",
    isLight ? "#ffffff" : adjustBrightness(bg, 10),
  );
  root.style.setProperty("--color-surface-hover", hexToRgba(fg, 0.08));
  root.style.setProperty("--color-surface-active", hexToRgba(fg, 0.14));

  // Accent
  root.style.setProperty("--color-accent", accent);
  root.style.setProperty("--color-accent-soft", hexToRgba(accent, 0.18));
  root.style.setProperty("--color-accent-hover", hexToRgba(accent, 0.28));

  // Text
  root.style.setProperty("--color-text-header", fg);
  root.style.setProperty("--color-text-body", theme.colors.color7 || fg);
  root.style.setProperty(
    "--color-text-subtitle",
    theme.colors.color8 || (isLight ? "#6c6356" : "#9c9fa3"),
  );
  root.style.setProperty("--color-text-muted", isLight ? "#9b9184" : "#6c665d");

  // Border
  root.style.setProperty("--color-border", hexToRgba(fg, 0.1));
  root.style.setProperty("--color-border-strong", hexToRgba(fg, 0.18));
};

const adjustBrightness = (hex: string, percent: number): string => {
  if (!hex || !hex.startsWith("#")) return hex;
  const clean = hex.replace("#", "");
  let r = parseInt(clean.substring(0, 2), 16);
  let g = parseInt(clean.substring(2, 4), 16);
  let b = parseInt(clean.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;

  r = Math.min(255, Math.max(0, r + Math.round((255 * percent) / 100)));
  g = Math.min(255, Math.max(0, g + Math.round((255 * percent) / 100)));
  b = Math.min(255, Math.max(0, b + Math.round((255 * percent) / 100)));

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

export const loadThemeColorsAtom = atom(null, async (get, set) => {
  set(themeLoadingAtom, true);
  try {
    const data = await getThemeColors();
    if (data) {
      set(pywalThemeAtom, data);
      const appearance = get(appearanceAtom);
      applyThemeToDOM(data, appearance);
      logger.info("Pywal theme colors loaded and applied");
    }
  } catch (err) {
    logger.warn("Failed to load pywal theme colors", err);
  } finally {
    set(themeLoadingAtom, false);
  }
});
