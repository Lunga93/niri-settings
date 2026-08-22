import { describe, it, expect, vi, beforeEach } from "vitest";
import { createStore } from "jotai";
import {
  settingsAtom,
  appearanceAtom,
  displayAtom,
  iconsAtom,
  soundAtom,
  setSettingsFieldAtom,
  setSettingsSectionAtom,
  setColorSchemeAtom,
  setAccentColorAtom,
  setDisplayScaleAtom,
  setNightLightAtom,
  setOutputVolumeAtom,
  setOutputMutedAtom,
  setInputMutedAtom,
} from "./atoms";

vi.mock("./services", () => ({
  writeSettings: vi.fn().mockResolvedValue(true),
  readSettings: vi.fn().mockResolvedValue(null),
  setGSetting: vi.fn().mockResolvedValue(true),
  getWallpaperInfo: vi.fn().mockResolvedValue({
    current_wallpaper: "/home/user/Pictures/wallpapers/forest.jpg",
    total_scanned: 10,
    mood_counts: { dark: 5, light: 5, warm: 0, cool: 0, sky: 0, earth: 0 },
    wallpapers_by_mood: {
      dark: ["/home/user/Pictures/wallpapers/dark1.jpg"],
      light: ["/home/user/Pictures/wallpapers/light1.jpg"],
      warm: [],
      cool: [],
      sky: [],
      earth: [],
    },
    wallpapers: [
      {
        path: "/home/user/Pictures/wallpapers/dark1.jpg",
        filename: "dark1.jpg",
        name: "dark1",
        moods: ["dark"],
        file_size: 1000,
        mtime: 12345,
      },
      {
        path: "/home/user/Pictures/wallpapers/light1.jpg",
        filename: "light1.jpg",
        name: "light1",
        moods: ["light"],
        file_size: 2000,
        mtime: 12346,
      },
    ],
    skip_today: false,
  }),
  setWallpaper: vi.fn().mockResolvedValue(true),
  getThemeColors: vi.fn().mockResolvedValue(null),
}));

vi.mock("./sidecar", () => ({
  execScript: vi.fn().mockResolvedValue(undefined),
}));

describe("settingsAtom", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it("initializes with defaults", () => {
    const data = store.get(settingsAtom);
    expect(data.wallpaper.frequency).toBe("daily");
    expect(data.appearance.color_scheme).toBe("dark");
    expect(data.display.scale).toBe("1.0");
    expect(data.icons.icon_theme).toBe("Papirus");
    expect(data.sound.output_volume).toBe(100);
  });

  it("derived appearanceAtom reads appearance section", () => {
    const appearance = store.get(appearanceAtom);
    expect(appearance.color_scheme).toBe("dark");
    expect(appearance.accent_mode).toBe("dynamic");
  });

  it("derived displayAtom reads display section", () => {
    const display = store.get(displayAtom);
    expect(display.scale).toBe("1.0");
    expect(display.night_light_enabled).toBe(false);
  });

  it("derived iconsAtom reads icons section", () => {
    const icons = store.get(iconsAtom);
    expect(icons.icon_theme).toBe("Papirus");
    expect(icons.cursor_size).toBe(24);
  });

  it("derived soundAtom reads sound section", () => {
    const sound = store.get(soundAtom);
    expect(sound.output_volume).toBe(100);
    expect(sound.output_muted).toBe(false);
  });
});

describe("setSettingsFieldAtom", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it("updates a single field in a section", () => {
    store.set(setSettingsFieldAtom, {
      section: "display",
      key: "scale",
      value: "1.5",
    });
    expect(store.get(displayAtom).scale).toBe("1.5");
  });

  it("does not mutate other fields in the same section", () => {
    store.set(setSettingsFieldAtom, {
      section: "display",
      key: "scale",
      value: "2.0",
    });
    const display = store.get(displayAtom);
    expect(display.night_light_enabled).toBe(false);
    expect(display.night_light_temperature).toBe(4000);
  });

  it("does not mutate other sections", () => {
    store.set(setSettingsFieldAtom, {
      section: "display",
      key: "scale",
      value: "2.0",
    });
    expect(store.get(appearanceAtom).color_scheme).toBe("dark");
    expect(store.get(iconsAtom).icon_theme).toBe("Papirus");
  });
});

describe("setSettingsSectionAtom", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it("merges partial section data", () => {
    store.set(setSettingsSectionAtom, {
      section: "sound",
      partial: { output_volume: 50, output_muted: true },
    });
    const sound = store.get(soundAtom);
    expect(sound.output_volume).toBe(50);
    expect(sound.output_muted).toBe(true);
    // Unspecified fields preserved
    expect(sound.input_volume).toBe(100);
  });
});

describe("appearance write atoms", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it("setColorSchemeAtom updates color_scheme", () => {
    store.set(setColorSchemeAtom, "light");
    expect(store.get(appearanceAtom).color_scheme).toBe("light");
  });

  it("setAccentColorAtom sets manual mode and color", () => {
    store.set(setAccentColorAtom, "#ff375f");
    const appearance = store.get(appearanceAtom);
    expect(appearance.accent_mode).toBe("manual");
    expect(appearance.manual_primary).toBe("#ff375f");
  });
});

describe("display write atoms", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it("setDisplayScaleAtom updates scale", () => {
    store.set(setDisplayScaleAtom, "1.5");
    expect(store.get(displayAtom).scale).toBe("1.5");
  });

  it("setNightLightAtom updates enabled", () => {
    store.set(setNightLightAtom, true);
    expect(store.get(displayAtom).night_light_enabled).toBe(true);
  });
});

describe("sound write atoms", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it("setOutputVolumeAtom updates output volume", () => {
    store.set(setOutputVolumeAtom, 42);
    expect(store.get(soundAtom).output_volume).toBe(42);
  });

  it("setOutputMutedAtom updates muted state", () => {
    store.set(setOutputMutedAtom, true);
    expect(store.get(soundAtom).output_muted).toBe(true);
  });

  it("setInputMutedAtom updates input muted state", () => {
    store.set(setInputMutedAtom, true);
    expect(store.get(soundAtom).input_muted).toBe(true);
  });
});
