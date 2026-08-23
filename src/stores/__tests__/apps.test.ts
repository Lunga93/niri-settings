import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore } from "jotai";
import {
  loadDefaultAppsAtom,
  setDefaultAppAtom,
  defaultGroupsAtom,
  loadInstalledAppsAtom,
  installedAppsAtom,
} from "../apps";
import { listDefaultApps, setDefaultApp } from "@/lib/services";
import type { DefaultGroup } from "@/lib/schemas";

vi.mock("@/lib/services", () => ({
  listDefaultApps: vi.fn(),
  listInstalledApps: vi.fn().mockResolvedValue([
    {
      id: "zen",
      name: "Zen Browser",
      exec: "/usr/bin/zen",
      icon: "zen",
      comment: "",
      mime_types: ["text/html"],
    },
  ]),
  setDefaultApp: vi.fn().mockResolvedValue(true),
}));

const groupPayload = (current: string): DefaultGroup[] => [
  {
    id: "browser",
    label: "Web Browser",
    mimes: ["text/html"],
    current,
    candidates: [
      {
        id: "zen",
        name: "Zen Browser",
        exec: "/usr/bin/zen",
        icon: "zen",
        comment: "",
        mime_types: ["text/html"],
      },
      {
        id: "firefox",
        name: "Firefox",
        exec: "/usr/bin/firefox",
        icon: "firefox",
        comment: "",
        mime_types: ["text/html"],
      },
    ],
  },
];

describe("appsAtoms", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = createStore();
    vi.mocked(listDefaultApps).mockResolvedValue(groupPayload("zen.desktop"));
    vi.mocked(setDefaultApp).mockResolvedValue(true);
  });

  it("loadDefaultAppsAtom populates groups", async () => {
    await store.set(loadDefaultAppsAtom);
    const groups = store.get(defaultGroupsAtom);
    expect(groups).toHaveLength(1);
    expect(groups[0].current).toBe("zen.desktop");
  });

  it("loadInstalledAppsAtom populates installed apps", async () => {
    await store.set(loadInstalledAppsAtom);
    expect(store.get(installedAppsAtom)).toHaveLength(1);
  });

  it("setDefaultAppAtom reconciles with server state after success", async () => {
    await store.set(loadDefaultAppsAtom);
    vi.mocked(listDefaultApps).mockResolvedValueOnce(groupPayload("firefox.desktop"));
    await store.set(setDefaultAppAtom, { group: "browser", desktopId: "firefox" });
    expect(setDefaultApp).toHaveBeenCalledWith("browser", "firefox");
    expect(store.get(defaultGroupsAtom)[0].current).toBe("firefox.desktop");
  });

  it("setDefaultAppAtom reverts on failure", async () => {
    await store.set(loadDefaultAppsAtom);
    vi.mocked(setDefaultApp).mockResolvedValueOnce(false);
    const result = await store.set(setDefaultAppAtom, { group: "browser", desktopId: "firefox" });
    expect(result).toBe(false);
    expect(store.get(defaultGroupsAtom)[0].current).toBe("zen.desktop");
  });
});
