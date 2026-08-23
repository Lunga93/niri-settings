import { z } from "zod";

export const HelperScriptResultSchema = z.object({
  script: z.string(),
  status: z.enum(["installed", "updated", "kept"]),
  detail: z.string(),
});
export type HelperScriptResult = z.infer<typeof HelperScriptResultSchema>;

export const InstallHelpersResponseSchema = z.object({
  dir: z.string(),
  results: z.array(HelperScriptResultSchema),
});
export type InstallHelpersResponse = z.infer<typeof InstallHelpersResponseSchema>;

export const TierStatusSchema = z.object({
  dotfiles_present: z.boolean(),
  dotfiles_dir: z.string(),
  stowed: z.array(z.string()),
  tier: z.number().int().min(0).max(2),
});
export type TierStatus = z.infer<typeof TierStatusSchema>;

export const TierStatusPayloadSchema = z.object({ status: TierStatusSchema });

export const AdoptResultSchema = z.object({
  status: z.enum(["launched", "preview_launched", "already_active"]),
  backup_id: z.string().optional(),
  backed_up: z.number().optional(),
  detail: z.string().optional(),
});
export type AdoptResult = z.infer<typeof AdoptResultSchema>;

export const Tier2AdoptPayloadSchema = z.object({ result: AdoptResultSchema });

export const BackupInfoSchema = z.object({
  id: z.string(),
  created: z.string(),
  items: z.number(),
});
export type BackupInfo = z.infer<typeof BackupInfoSchema>;

export const BackupsPayloadSchema = z.object({ backups: z.array(BackupInfoSchema) });

export const RestorePayloadSchema = z.object({ restored: z.number() });
