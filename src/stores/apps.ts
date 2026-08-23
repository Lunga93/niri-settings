import { atom } from "jotai";
import { listInstalledApps, listDefaultApps, setDefaultApp } from "@/lib/services";
import type { DesktopApp, DefaultGroup } from "@/lib/schemas";

export const installedAppsAtom = atom<DesktopApp[]>([]);
export const installedAppsLoadingAtom = atom<boolean>(false);

export const defaultGroupsAtom = atom<DefaultGroup[]>([]);
export const defaultAppsLoadingAtom = atom<boolean>(false);

export const loadInstalledAppsAtom = atom(null, async (_get, set) => {
  set(installedAppsLoadingAtom, true);
  try {
    const apps = await listInstalledApps();
    set(installedAppsAtom, apps);
  } finally {
    set(installedAppsLoadingAtom, false);
  }
});

export const loadDefaultAppsAtom = atom(null, async (_get, set) => {
  set(defaultAppsLoadingAtom, true);
  try {
    const groups = await listDefaultApps();
    set(defaultGroupsAtom, groups);
  } finally {
    set(defaultAppsLoadingAtom, false);
  }
});

export const setDefaultAppAtom = atom(
  null,
  async (get, set, params: { group: string; desktopId: string }) => {
    const previous = get(defaultGroupsAtom);
    const optimisticId = params.desktopId.endsWith(".desktop")
      ? params.desktopId
      : `${params.desktopId}.desktop`;
    set(defaultGroupsAtom, (groups) =>
      groups.map((group) =>
        group.id === params.group ? { ...group, current: optimisticId } : group,
      ),
    );
    const ok = await setDefaultApp(params.group, params.desktopId);
    if (!ok) {
      set(defaultGroupsAtom, previous);
    } else {
      void listDefaultApps().then((groups) => set(defaultGroupsAtom, groups));
    }
    return ok;
  },
);
