import { z } from "zod";
import { callSidecar } from "../ipc";
import {
  InstallHelpersResponseSchema,
  TierStatusPayloadSchema,
  Tier2AdoptPayloadSchema,
  BackupsPayloadSchema,
  RestorePayloadSchema,
  UpdateInfoSchema,
  UpdateProgressSchema,
  type TierStatus,
  type AdoptResult,
  type BackupInfo,
  type InstallHelpersResponse,
  type UpdateInfo,
  type UpdateProgress,
} from "../schemas";

export const installHelperScripts = async (): Promise<InstallHelpersResponse | null> =>
  callSidecar("install_helper_scripts", InstallHelpersResponseSchema, {});

export const getTierStatus = async (): Promise<TierStatus | null> => {
  const payload = await callSidecar("get_tier_status", TierStatusPayloadSchema, {});
  return payload?.status ?? null;
};

export const adoptTier2 = async (dryRun: boolean): Promise<AdoptResult | null> => {
  const payload = await callSidecar("adopt_tier2", Tier2AdoptPayloadSchema, { dry_run: dryRun });
  return payload?.result ?? null;
};

export const listTier2Backups = async (): Promise<BackupInfo[]> => {
  const payload = await callSidecar("list_tier2_backups", BackupsPayloadSchema, {});
  return payload?.backups ?? [];
};

export const restoreTier2Backup = async (id: string): Promise<number | null> => {
  const payload = await callSidecar("restore_tier2_backup", RestorePayloadSchema, { id });
  return payload?.restored ?? null;
};

export const checkForUpdate = async (): Promise<UpdateInfo | null> =>
  callSidecar("check_for_update", UpdateInfoSchema, {});

export const downloadUpdate = async (url: string): Promise<UpdateProgress | null> =>
  callSidecar("download_update", UpdateProgressSchema, { url });

export const applyUpdate = async (path: string): Promise<UpdateProgress | null> =>
  callSidecar("apply_update", UpdateProgressSchema, { path });

export const pendingUpdate = async (): Promise<{ pending: boolean; message?: string } | null> =>
  callSidecar(
    "pending_update",
    z.object({ pending: z.boolean(), message: z.string().optional() }),
    {},
  );
