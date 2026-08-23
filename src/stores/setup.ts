import { atom } from "jotai";
import { getTierStatus, listTier2Backups, checkForUpdate } from "@/lib/services";
import type { TierStatus, BackupInfo, UpdateInfo } from "@/lib/schemas";

export const tierStatusAtom = atom<TierStatus | null>(null);
export const tierBackupsAtom = atom<BackupInfo[]>([]);

export const loadTierStatusAtom = atom(null, async (_get, set) => {
  const status = await getTierStatus();
  if (status) {
    set(tierStatusAtom, status);
  }
  set(tierBackupsAtom, await listTier2Backups());
});

// Update check
export const updateInfoAtom = atom<UpdateInfo | null>(null);

export const checkUpdateAtom = atom(null, async (_get, set) => {
  const info = await checkForUpdate();
  if (info?.available) {
    set(updateInfoAtom, info);
  }
});
