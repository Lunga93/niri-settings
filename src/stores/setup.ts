import { atom } from "jotai";
import { getTierStatus, listTier2Backups } from "@/lib/services";
import type { TierStatus, BackupInfo } from "@/lib/schemas";

export const tierStatusAtom = atom<TierStatus | null>(null);
export const tierBackupsAtom = atom<BackupInfo[]>([]);

export const loadTierStatusAtom = atom(null, async (_get, set) => {
  const status = await getTierStatus();
  if (status) {
    set(tierStatusAtom, status);
  }
  set(tierBackupsAtom, await listTier2Backups());
});
