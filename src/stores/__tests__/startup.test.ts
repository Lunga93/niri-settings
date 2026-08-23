import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore } from "jotai";
import {
  loadStartupAppsAtom,
  toggleStartupAppAtom,
  removeStartupAppAtom,
  startupAppsAtom,
  startupRunnerAtom,
} from "../startup";

vi.mock("@/lib/services", () => ({
  listStartupApps: vi.fn().mockResolvedValue({
    apps: [
      {
        id: "my-app",
        name: "My App",
        command: "/usr/bin/my-app",
        comment: "",
        hidden: false,
        terminal: false,
        path: "/home/u/.config/autostart/my-app.desktop",
      },
    ],
    runner: {
      runner_installed: true,
      runner_installed_detail: "dex",
      runner_line_present: true,
    },
  }),
  setStartupAppEnabled: vi.fn().mockResolvedValue(true),
  deleteStartupApp: vi.fn().mockResolvedValue(true),
  upsertStartupApp: vi.fn().mockResolvedValue(true),
  ensureAutostartRunner: vi.fn().mockResolvedValue("added"),
}));

describe("startupAtoms", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = createStore();
  });

  it("loadStartupAppsAtom populates apps and runner", async () => {
    await store.set(loadStartupAppsAtom);
    const apps = store.get(startupAppsAtom);
    expect(apps).toHaveLength(1);
    expect(store.get(startupRunnerAtom).runner_installed_detail).toBe("dex");
  });

  it("toggleStartupAppAtom flips hidden optimistically", async () => {
    await store.set(loadStartupAppsAtom);
    await store.set(toggleStartupAppAtom, "my-app");
    expect(store.get(startupAppsAtom)[0].hidden).toBe(true);
  });

  it("removeStartupAppAtom drops the entry on success", async () => {
    await store.set(loadStartupAppsAtom);
    await store.set(removeStartupAppAtom, "my-app");
    expect(store.get(startupAppsAtom)).toHaveLength(0);
  });
});
