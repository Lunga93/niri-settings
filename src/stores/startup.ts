import { atom } from "jotai";
import type { RunnerStatus, StartupApp } from "@/lib/schemas";
import {
  deleteStartupApp,
  ensureAutostartRunner,
  listStartupApps,
  setStartupAppEnabled,
  upsertStartupApp,
} from "@/lib/services";
import { logger } from "@/lib/logger";

const EMPTY_RUNNER: RunnerStatus = {
  runner_installed: false,
  runner_installed_detail: "",
  runner_line_present: false,
};

export const startupAppsAtom = atom<StartupApp[]>([]);
export const startupRunnerAtom = atom<RunnerStatus>(EMPTY_RUNNER);
export const startupLoadingAtom = atom<boolean>(false);

export const loadStartupAppsAtom = atom(null, async (_get, set) => {
  set(startupLoadingAtom, true);
  try {
    const data = await listStartupApps();
    if (data) {
      set(startupAppsAtom, data.apps);
      set(startupRunnerAtom, data.runner);
    }
  } finally {
    set(startupLoadingAtom, false);
  }
});

export const toggleStartupAppAtom = atom(null, async (get, set, id: string) => {
  const app = get(startupAppsAtom).find((entry) => entry.id === id);
  if (!app) return;
  // Optimistic flip; reload reconciles with the file on failure.
  const nextHidden = !app.hidden;
  set(startupAppsAtom, (apps) =>
    apps.map((entry) => (entry.id === id ? { ...entry, hidden: nextHidden } : entry)),
  );
  const ok = await setStartupAppEnabled(id, !nextHidden);
  if (!ok) {
    logger.warn(`Failed to persist startup toggle for ${id}; reloading`);
    await set(loadStartupAppsAtom);
  }
});

export interface NewStartupApp {
  readonly name: string;
  readonly command: string;
  readonly comment: string;
}

export const addStartupAppAtom = atom(null, async (_get, set, input: NewStartupApp) => {
  const ok = await upsertStartupApp(input.name, input.command, input.comment);
  if (ok) await set(loadStartupAppsAtom);
  return ok;
});

export const removeStartupAppAtom = atom(null, async (_get, set, id: string) => {
  const ok = await deleteStartupApp(id);
  if (ok) {
    set(startupAppsAtom, (apps) => apps.filter((entry) => entry.id !== id));
  } else {
    await set(loadStartupAppsAtom);
  }
});

export const ensureAutostartRunnerAtom = atom(null, async (_get, set) => {
  const result = await ensureAutostartRunner();
  await set(loadStartupAppsAtom);
  return result;
});
