// Mood-based color palettes extracted from wallpaper aesthetics.
// Each palette defines colors that a screenshot's wallpaper would produce
// when run through niri-settings' pywal theme engine.

export interface MoodPalette {
  name: string;
  label: string;
  // Core surfaces
  bg: string;
  bgSecondary: string;
  card: string;
  cardBorder: string;
  // Text
  text: string;
  textSecondary: string;
  // Accent gradient
  accentFrom: string;
  accentTo: string;
  // Hero gradient orbs
  orbA: string;
  orbB: string;
  // Feature icon tints
  iconBg: string;
  // Terminal colors
  terminalBg: string;
  terminalPrompt: string;
  terminalKeyword: string;
  terminalComment: string;
}

export const MOOD_PALETTES: MoodPalette[] = [
  {
    name: "earth",
    label: "Earth",
    bg: "#0a0a0f",
    bgSecondary: "#0d0d15",
    card: "rgba(255,255,255,0.03)",
    cardBorder: "rgba(255,255,255,0.06)",
    text: "#ffffff",
    textSecondary: "#9ca3af",
    accentFrom: "#60a5fa",
    accentTo: "#a78bfa",
    orbA: "rgba(96,165,250,0.2)",
    orbB: "rgba(167,139,250,0.2)",
    iconBg: "rgba(96,165,250,0.2)",
    terminalBg: "#111118",
    terminalPrompt: "#22c55e",
    terminalKeyword: "#60a5fa",
    terminalComment: "#6b7280",
  },
  {
    name: "ocean",
    label: "Ocean",
    bg: "#070b14",
    bgSecondary: "#0a1020",
    card: "rgba(56,189,248,0.04)",
    cardBorder: "rgba(56,189,248,0.08)",
    text: "#f0f9ff",
    textSecondary: "#7dd3fc",
    accentFrom: "#0ea5e9",
    accentTo: "#6366f1",
    orbA: "rgba(14,165,233,0.25)",
    orbB: "rgba(99,102,241,0.2)",
    iconBg: "rgba(14,165,233,0.2)",
    terminalBg: "#0c1424",
    terminalPrompt: "#38bdf8",
    terminalKeyword: "#0ea5e9",
    terminalComment: "#7dd3fc",
  },
  {
    name: "sunset",
    label: "Sunset",
    bg: "#120a0a",
    bgSecondary: "#1a0e0e",
    card: "rgba(249,115,22,0.04)",
    cardBorder: "rgba(249,115,22,0.08)",
    text: "#fff7ed",
    textSecondary: "#fdba74",
    accentFrom: "#f97316",
    accentTo: "#ef4444",
    orbA: "rgba(249,115,22,0.25)",
    orbB: "rgba(239,68,68,0.2)",
    iconBg: "rgba(249,115,22,0.2)",
    terminalBg: "#1c0f0a",
    terminalPrompt: "#fb923c",
    terminalKeyword: "#f97316",
    terminalComment: "#fdba74",
  },
  {
    name: "aurora",
    label: "Aurora",
    bg: "#060f0f",
    bgSecondary: "#0a1818",
    card: "rgba(45,212,191,0.04)",
    cardBorder: "rgba(45,212,191,0.08)",
    text: "#f0fdfa",
    textSecondary: "#5eead4",
    accentFrom: "#2dd4bf",
    accentTo: "#818cf8",
    orbA: "rgba(45,212,191,0.25)",
    orbB: "rgba(129,140,248,0.2)",
    iconBg: "rgba(45,212,191,0.2)",
    terminalBg: "#0a1a1a",
    terminalPrompt: "#2dd4bf",
    terminalKeyword: "#2dd4bf",
    terminalComment: "#5eead4",
  },
];

// The default palette (matches the site's base dark theme)
export const DEFAULT_PALETTE = MOOD_PALETTES[0];
