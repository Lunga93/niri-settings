import { describe, it, expect, vi, beforeEach } from "vitest";
import { createStore } from "jotai";
import {
  settingsAtom,
  wallpaperAtom,
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
  setWallpaperFrequencyAtom,
  setWallpaperMoodAtom,
  toggleWallpaperSourceAtom,
} from "./atoms";

vi.mock("./services", () => ({
  writeSettings: vi.fn().mockResolvedValue(true),
  readSettings: vi.fn().mockResolvedValue(null),
  setGSetting: vi.fn().mockResolvedValue(true),
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

  it("derived wallpaperAtom reads wallpaper section", () => {
    const wallpaper = store.get(wallpaperAtom);
    expect(wallpaper.frequency).toBe("daily");
    expect(wallpaper.selected_mood).toBeNull();
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

describe("wallpaper write atoms", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it("setWallpaperFrequencyAtom updates frequency", () => {
    store.set(setWallpaperFrequencyAtom, "hourly");
    expect(store.get(wallpaperAtom).frequency).toBe("hourly");
  });

  it("setWallpaperMoodAtom updates selected_mood", () => {
    store.set(setWallpaperMoodAtom, "ocean");
    expect(store.get(wallpaperAtom).selected_mood).toBe("ocean");
  });

  it("setWallpaperMoodAtom can set null", () => {
    store.set(setWallpaperMoodAtom, "sunset");
    store.set(setWallpaperMoodAtom, null);
    expect(store.get(wallpaperAtom).selected_mood).toBeNull();
  });

  it("toggleWallpaperSourceAtom toggles a source on", () => {
    // Start with defaults — local is true
    store.set(toggleWallpaperSourceAtom, "local");
    expect(store.get(wallpaperAtom).sources_enabled.local).toBe(false);
  });

  it("toggleWallpaperSourceAtom toggles a source off and on", () => {
    store.set(toggleWallpaperSourceAtom, "local"); // true → false
    store.set(toggleWallpaperSourceAtom, "local"); // false → true
    expect(store.get(wallpaperAtom).sources_enabled.local).toBe(true);
  });

  it("toggleWallpaperSourceAtom creates new source if not in defaults", () => {
    store.set(toggleWallpaperSourceAtom, "reddit");
    expect(store.get(wallpaperAtom).sources_enabled.reddit).toBe(true);
  });
});
