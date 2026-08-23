import { z } from "zod";

// XDG autostart entry as exposed by the sidecar's list_startup_apps.
export const StartupAppSchema = z.object({
  id: z.string(),
  name: z.string(),
  command: z.string(),
  comment: z.string(),
  hidden: z.boolean(),
  terminal: z.boolean(),
  path: z.string(),
});

export const RunnerStatusSchema = z.object({
  runner_installed: z.boolean(),
  runner_installed_detail: z.string(),
  runner_line_present: z.boolean(),
});

export const StartupAppsPayloadSchema = z.object({
  apps: z.array(StartupAppSchema),
  runner: RunnerStatusSchema,
});

export const EnsureRunnerResponseSchema = z.object({
  status: z.enum(["added", "already-present"]),
});

export type StartupApp = z.infer<typeof StartupAppSchema>;
export type RunnerStatus = z.infer<typeof RunnerStatusSchema>;
export type StartupAppsPayload = z.infer<typeof StartupAppsPayloadSchema>;
