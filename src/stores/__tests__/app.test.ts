import { describe, it, expect, beforeEach } from "vitest";
import { createStore } from "jotai";
import { activePageAtom, SIDEBAR_SECTIONS, type PageId } from "../app";

describe("activePageAtom", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it("defaults to wallpaper", () => {
    expect(store.get(activePageAtom)).toBe("wallpaper");
  });

  it("can be set to any valid page", () => {
    const pages: PageId[] = [
      "wallpaper",
      "appearance",
      "icons",
      "display",
      "keybindings",
      "network",
      "sound",
      "sysinfo",
    ];
    for (const page of pages) {
      store.set(activePageAtom, page);
      expect(store.get(activePageAtom)).toBe(page);
    }
  });
});

describe("SIDEBAR_SECTIONS", () => {
  it("has three sections", () => {
    expect(SIDEBAR_SECTIONS).toHaveLength(3);
  });

  it("first section is Personalization", () => {
    expect(SIDEBAR_SECTIONS[0].section).toBe("Personalization");
  });

  it("second section is System", () => {
    expect(SIDEBAR_SECTIONS[1].section).toBe("System");
  });

  it("third section is About", () => {
    expect(SIDEBAR_SECTIONS[2].section).toBe("About");
  });

  it("Personalization has wallpaper, appearance, icons", () => {
    const ids = SIDEBAR_SECTIONS[0].items.map((i) => i.id);
    expect(ids).toEqual(["wallpaper", "appearance", "icons"]);
  });

  it("System has display, keybindings, network, sound", () => {
    const ids = SIDEBAR_SECTIONS[1].items.map((i) => i.id);
    expect(ids).toEqual(["display", "keybindings", "network", "sound"]);
  });

  it("About has sysinfo", () => {
    const ids = SIDEBAR_SECTIONS[2].items.map((i) => i.id);
    expect(ids).toEqual(["sysinfo"]);
  });

  it("every item has id, label, and icon", () => {
    for (const section of SIDEBAR_SECTIONS) {
      for (const item of section.items) {
        expect(item.id).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.icon).toBeTruthy();
      }
    }
  });
});
