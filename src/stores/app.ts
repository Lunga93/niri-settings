import { atom } from "jotai";

export type PageId =
  | "setup"
  | "wallpaper"
  | "appearance"
  | "icons"
  | "defaults"
  | "display"
  | "keybindings"
  | "startup"
  | "network"
  | "sound"
  | "sysinfo";

export interface SidebarItem {
  readonly id: PageId;
  readonly label: string;
  readonly icon: string;
}

export interface SidebarSection {
  readonly section: string;
  readonly items: readonly SidebarItem[];
}

export const SIDEBAR_SECTIONS: readonly SidebarSection[] = [
  {
    section: "Personalization",
    items: [
      { id: "setup", label: "Get Started", icon: "sparkles" },
      { id: "wallpaper", label: "Wallpaper", icon: "image" },
      { id: "appearance", label: "Appearance", icon: "palette" },
      { id: "icons", label: "Icons", icon: "shapes" },
      { id: "defaults", label: "Default Apps", icon: "app-window" },
    ],
  },
  {
    section: "System",
    items: [
      { id: "display", label: "Display", icon: "monitor" },
      { id: "keybindings", label: "Keybindings", icon: "keyboard" },
      { id: "startup", label: "Startup Apps", icon: "rocket" },
      { id: "network", label: "Network", icon: "wifi" },
      { id: "sound", label: "Sound", icon: "volume-2" },
    ],
  },
  {
    section: "About",
    items: [{ id: "sysinfo", label: "System Info", icon: "info" }],
  },
];

export const activePageAtom = atom<PageId>("wallpaper");
