import { describe, it, expect, beforeEach } from "vitest";
import { createStore } from "jotai";
import {
  keybindingsAtom,
  bindingForAtom,
  setKeybindingsAtom,
  KEYBINDING_GROUPS,
} from "@/stores/keybindingAtoms";

describe("keybindingsAtom", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it("initializes as empty array", () => {
    expect(store.get(keybindingsAtom)).toEqual([]);
  });

  it("setKeybindingsAtom replaces all bindings", () => {
    const bindings = [
      { action: "close-window", key: "MOD+Q" },
      { action: "quit", key: "MOD+SHIFT+E" },
    ];
    store.set(setKeybindingsAtom, bindings);
    expect(store.get(keybindingsAtom)).toHaveLength(2);
    expect(store.get(keybindingsAtom)[0].action).toBe("close-window");
  });
});

describe("bindingForAtom", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    store.set(setKeybindingsAtom, [
      { action: "close-window", key: "MOD+Q" },
      { action: "quit", key: "MOD+SHIFT+E" },
      { action: "focus-column-left", key: "MOD+H" },
    ]);
  });

  it("finds a binding by action", () => {
    const binding = store.get(bindingForAtom("close-window"));
    expect(binding).not.toBeNull();
    expect(binding?.key).toBe("MOD+Q");
  });

  it("returns null for unknown action", () => {
    const binding = store.get(bindingForAtom("nonexistent-action"));
    expect(binding).toBeNull();
  });

  it("finds different bindings", () => {
    expect(store.get(bindingForAtom("quit"))?.key).toBe("MOD+SHIFT+E");
    expect(store.get(bindingForAtom("focus-column-left"))?.key).toBe("MOD+H");
  });
});

describe("KEYBINDING_GROUPS", () => {
  it("has at least one group", () => {
    expect(KEYBINDING_GROUPS.length).toBeGreaterThan(0);
  });

  it("every group has a name and rows", () => {
    for (const group of KEYBINDING_GROUPS) {
      expect(group.name).toBeTruthy();
      expect(group.rows.length).toBeGreaterThan(0);
    }
  });

  it("every row has an action and label", () => {
    for (const group of KEYBINDING_GROUPS) {
      for (const row of group.rows) {
        expect(row.action).toBeTruthy();
        expect(row.label).toBeTruthy();
      }
    }
  });

  it("has the expected group names", () => {
    const names = KEYBINDING_GROUPS.map((g) => g.name);
    expect(names).toContain("General");
    expect(names).toContain("Window Focus");
    expect(names).toContain("Window Movement");
    expect(names).toContain("Workspaces");
    expect(names).toContain("Layout");
    expect(names).toContain("Screenshots");
    expect(names).toContain("Power");
  });

  it("General group includes terminal launcher", () => {
    const general = KEYBINDING_GROUPS.find((g) => g.name === "General");
    expect(general?.rows.some((r) => r.action.includes("alacritty"))).toBe(true);
  });

  it("Power group includes quit action", () => {
    const power = KEYBINDING_GROUPS.find((g) => g.name === "Power");
    expect(power?.rows.some((r) => r.action === "quit")).toBe(true);
  });
});
