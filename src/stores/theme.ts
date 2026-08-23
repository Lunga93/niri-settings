import { atom, type Getter, type Setter } from "jotai";
import { PywalThemeSchema, type PywalTheme, type AppearanceSettings } from "../lib/schemas";
import { getThemeColors, writeSettings } from "../lib/services";
import { execScript } from "../lib/ipc";
import { logger } from "../lib/logger";
import { settingsAtom, appearanceAtom } from "./settings";

export const DEFAULT_PYWAL_THEME: PywalTheme = PywalThemeSchema.parse({});

export const pywalThemeAtom = atom<PywalTheme>(DEFAULT_PYWAL_THEME);
export const themeLoadingAtom = atom<boolean>(false);

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

const adjustBrightness = (hex: string, percent: number): string => {
  if (!hex || !hex.startsWith("#")) return hex;
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;

  const clamp = (v: number): number => Math.min(255, Math.max(0, v));
  return `#${clamp(r + Math.round((255 * percent) / 100))
    .toString(16)
    .padStart(2, "0")}${clamp(g + Math.round((255 * percent) / 100))
    .toString(16)
    .padStart(2, "0")}${clamp(b + Math.round((255 * percent) / 100))
    .toString(16)
    .padStart(2, "0")}`;
};

export interface ThemeTokens {
  isLight: boolean;
  window: string;
  sidebar: string;
  titlebar: string;
  elevated: string;
  hover: string;
  active: string;
  accent: string;
  textHeader: string;
  textBody: string;
  textSubtitle: string;
  textMuted: string;
  border: string;
}

// Single source of truth for theme math — consumed by applyThemeToDOM and
// the Appearance page's live preview so both always agree.
export const deriveThemeTokens = (
  theme: PywalTheme,
  appearance: AppearanceSettings,
): ThemeTokens => {
  const isLight = appearance.color_scheme === "light";
  const bg = theme.special.background || (isLight ? "#f5ede0" : "#12100e");
  const fg = theme.special.foreground || (isLight ? "#1a1611" : "#dfe4e9");

  let accent = theme.primary_accent || theme.colors.color4 || "#0a84ff";
  if (appearance.accent_mode === "manual" && appearance.manual_primary) {
    accent = appearance.manual_primary;
  }

  return {
    isLight,
    window: bg,
    sidebar: isLight ? "#ede3d4" : adjustBrightness(bg, -8),
    titlebar: isLight ? "#e5dbcc" : adjustBrightness(bg, 5),
    elevated: isLight ? "#ffffff" : adjustBrightness(bg, 10),
    hover: hexToRgba(fg, 0.08),
    active: hexToRgba(fg, 0.14),
    accent,
    textHeader: fg,
    textBody: theme.colors.color7 || fg,
    textSubtitle: theme.colors.color8 || (isLight ? "#6c6356" : "#9c9fa3"),
    textMuted: isLight ? "#9b9184" : "#6c665d",
    border: hexToRgba(fg, 0.1),
  };
};

const TOKEN_VAR_LIST: ReadonlyArray<[keyof ThemeTokens, string]> = [
  ["window", "--color-surface-window"],
  ["sidebar", "--color-surface-sidebar"],
  ["titlebar", "--color-surface-titlebar"],
  ["elevated", "--color-surface-elevated"],
  ["hover", "--color-surface-hover"],
  ["active", "--color-surface-active"],
  ["accent", "--color-accent"],
  ["textHeader", "--color-text-header"],
  ["textBody", "--color-text-body"],
  ["textSubtitle", "--color-text-subtitle"],
  ["textMuted", "--color-text-muted"],
  ["border", "--color-border"],
];

export const applyTokensToDOM = (tokens: ThemeTokens): void => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const [key, cssVar] of TOKEN_VAR_LIST) {
    root.style.setProperty(cssVar, String(tokens[key]));
  }
};

export const applyThemeToDOM = (theme: PywalTheme, appearance: AppearanceSettings): void => {
  applyTokensToDOM(deriveThemeTokens(theme, appearance));
};

// Appearance changes drive a heavy external pipeline (pywal regeneration +
// terminal broadcast + app config rewrites, easily seconds). Rapid toggles
// are serialized so an older slow run can never clobber a newer scheme.
let appearanceChain: Promise<void> = Promise.resolve();

const enqueueAppearanceChange = (task: () => Promise<void>): Promise<void> => {
  const run = appearanceChain.then(task).catch((err) => {
    logger.warn("Appearance pipeline failed", err);
  });
  appearanceChain = run;
  return run;
};

// State updates and the optimistic repaint happen synchronously; only the
// external regeneration is queued behind the chain.
const mutateAppearance = (
  get: Getter,
  set: Setter,
  partial: Partial<AppearanceSettings>,
): Promise<void> => {
  const nextAppearance = { ...get(appearanceAtom), ...partial };
  set(settingsAtom, { ...get(settingsAtom), appearance: nextAppearance });

  // Instant switch using the current palette — light mode gets its true
  // colors when the regenerated palette lands below.
  applyThemeToDOM(get(pywalThemeAtom), nextAppearance);

  return enqueueAppearanceChange(async () => {
    // The script reads color_scheme/accent overrides from settings.json, so
    // it must only start once the new snapshot is durably on disk.
    await writeSettings(get(settingsAtom));
    await execScript(`~/.local/bin/apply-theme "$(cat ~/.config/current_wallpaper)"`);

    const fresh = await getThemeColors();
    if (fresh) {
      set(pywalThemeAtom, fresh);
      applyThemeToDOM(fresh, get(appearanceAtom));
    }
  });
};

export const setColorSchemeAtom = atom(null, (get, set, scheme: "dark" | "light"): Promise<void> =>
  mutateAppearance(get, set, { color_scheme: scheme }),
);

export const setAccentColorAtom = atom(null, (get, set, color: string): Promise<void> =>
  mutateAppearance(get, set, { accent_mode: "manual", manual_primary: color }),
);

export const setAccentSecondaryAtom = atom(null, (get, set, color: string): Promise<void> =>
  mutateAppearance(get, set, { accent_mode: "manual", manual_secondary: color }),
);

export const setAccentModeAtom = atom(null, (get, set, mode: "dynamic" | "manual"): Promise<void> =>
  mutateAppearance(get, set, { accent_mode: mode }),
);

export const loadThemeColorsAtom = atom(null, async (get, set) => {
  set(themeLoadingAtom, true);
  try {
    const data = await getThemeColors();
    if (data) {
      set(pywalThemeAtom, data);
      applyThemeToDOM(data, get(appearanceAtom));
      logger.info("Pywal theme colors loaded and applied");
    }
  } catch (err) {
    logger.warn("Failed to load pywal theme colors", err);
  } finally {
    set(themeLoadingAtom, false);
  }
});
