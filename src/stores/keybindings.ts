import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import type { Keybinding } from "@/lib/schemas";

export const normalizeAction = (action: string): string =>
  action.replace(/["']/g, "").replace(/\s+/g, " ").trim();

const stripArgs = (action: string): string => {
  const normalized = normalizeAction(action);
  const spaceIdx = normalized.indexOf(" ");
  return spaceIdx > 0 ? normalized.substring(0, spaceIdx) : normalized;
};

export const actionsMatch = (a: string, b: string): boolean => {
  const normA = normalizeAction(a);
  const normB = normalizeAction(b);
  if (normA === normB) return true;
  const spawnA = normA.replace(/^spawn-sh\s+/, "spawn ");
  const spawnB = normB.replace(/^spawn-sh\s+/, "spawn ");
  if (spawnA === spawnB) return true;
  if (stripArgs(spawnA) === stripArgs(spawnB) && stripArgs(spawnA) !== "spawn") return true;
  return false;
};

// ── Primitive atoms ──
export const keybindingsAtom = atom<Keybinding[]>([]);

// ── Derived atoms ──
export const bindingForAtom = atomFamily((actionBody: string) =>
  atom((get) => get(keybindingsAtom).find((b) => actionsMatch(b.action, actionBody)) ?? null),
);

// ── Write atoms ──
export const setKeybindingsAtom = atom(null, (_get, set, bindings: Keybinding[]) => {
  set(keybindingsAtom, bindings);
});

// ── Curated, user-facing keybinding groups ──

interface KeybindingRow {
  readonly action: string;
  readonly label: string;
}

interface KeybindingGroup {
  readonly name: string;
  readonly rows: readonly KeybindingRow[];
}

export const KEYBINDING_GROUPS: readonly KeybindingGroup[] = [
  {
    name: "General",
    rows: [
      { action: "show-hotkey-overlay", label: "Show hotkey overlay" },
      { action: 'spawn-sh "qs ipc call settings toggle"', label: "Open Settings" },
      { action: 'spawn-sh "alacritty"', label: "Terminal (Alacritty)" },
      { action: 'spawn-sh "rofi -show drun -theme launcher.rasi"', label: "App Launcher (Rofi)" },
      { action: 'spawn-sh "zen-browser"', label: "Browser (Zen)" },
      { action: 'spawn-sh "nautilus"', label: "File Manager (Nautilus)" },
      { action: 'spawn-sh "swaync-client -t -sw"', label: "Toggle Notifications" },
      { action: 'spawn-sh "~/.local/bin/clipboard-manager"', label: "Clipboard Manager" },
      { action: 'spawn-sh "~/.local/bin/wallpaper-control"', label: "Wallpaper Control" },
      { action: 'spawn-sh "~/.local/bin/view-logs"', label: "View Logs" },
    ],
  },
  {
    name: "Window Focus",
    rows: [
      { action: "close-window", label: "Close window" },
      { action: "focus-column-left", label: "Focus column left" },
      { action: "focus-column-right", label: "Focus column right" },
      { action: "focus-window-up", label: "Focus window up" },
      { action: "focus-window-down", label: "Focus window down" },
      { action: "focus-column-first", label: "Focus first column" },
      { action: "focus-column-last", label: "Focus last column" },
    ],
  },
  {
    name: "Window Movement",
    rows: [
      { action: "move-column-left", label: "Move column left" },
      { action: "move-column-right", label: "Move column right" },
      { action: "move-window-up", label: "Move window up" },
      { action: "move-window-down", label: "Move window down" },
      { action: "move-column-to-first", label: "Move to first" },
      { action: "move-column-to-last", label: "Move to last" },
    ],
  },
  {
    name: "Workspaces",
    rows: [
      { action: "focus-workspace 1", label: "Switch to workspace 1" },
      { action: "focus-workspace 2", label: "Switch to workspace 2" },
      { action: "focus-workspace 3", label: "Switch to workspace 3" },
      { action: "focus-workspace 4", label: "Switch to workspace 4" },
      { action: "focus-workspace 5", label: "Switch to workspace 5" },
      { action: "focus-workspace-previous", label: "Previous workspace" },
    ],
  },
  {
    name: "Layout",
    rows: [
      { action: "expand-column-to-available-width", label: "Expand column" },
      { action: "center-column", label: "Center column" },
      { action: 'set-column-width "-10%"', label: "Column width -10%" },
      { action: 'set-column-width "+10%"', label: "Column width +10%" },
      { action: 'set-window-height "-10%"', label: "Window height -10%" },
      { action: 'set-window-height "+10%"', label: "Window height +10%" },
      { action: "toggle-window-floating", label: "Toggle floating" },
      { action: "fullscreen-window", label: "Toggle fullscreen" },
      { action: "toggle-column-tabbed-display", label: "Toggle tabbed display" },
      { action: "toggle-overview", label: "Toggle overview" },
    ],
  },
  {
    name: "Screenshots",
    rows: [
      { action: "screenshot", label: "Screenshot area" },
      { action: "screenshot-screen", label: "Screenshot screen" },
      { action: "screenshot-window", label: "Screenshot window" },
    ],
  },
  {
    name: "Power",
    rows: [
      { action: "quit", label: "Quit Niri" },
      { action: 'spawn-sh "~/.local/bin/lock-screen"', label: "Lock screen" },
      { action: "power-off-monitors", label: "Turn off monitors" },
    ],
  },
];
