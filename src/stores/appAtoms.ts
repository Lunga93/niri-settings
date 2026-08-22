import { atom } from "jotai";

export type PageId =
  | "wallpaper"
  | "appearance"
  | "icons"
  | "display"
  | "keybindings"
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
      { id: "wallpaper", label: "Wallpaper", icon: "image" },
      { id: "appearance", label: "Appearance", icon: "palette" },
      { id: "icons", label: "Icons", icon: "shapes" },
    ],
  },
  {
    section: "System",
    items: [
      { id: "display", label: "Display", icon: "monitor" },
      { id: "keybindings", label: "Keybindings", icon: "keyboard" },
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
