import { AppErrorSchema, type AppError } from "./schemas";
import { sidecarLogger } from "./logger";

/**
 * Normalizes raw IPC or sidecar errors into typed AppError instances.
 */
export const normalizeError = (err: unknown): AppError => {
  if (err && typeof err === "object" && "code" in err && "message" in err) {
    const parsed = AppErrorSchema.safeParse(err);
    if (parsed.success) {
      return parsed.data;
    }
  }

  if (err instanceof Error) {
    return {
      code: "UNKNOWN_ERROR",
      message: err.message,
      details: err.stack,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: String(err),
  };
};

interface ZodSchema<T> {
  safeParse: (data: unknown) => { success: true; data: T } | { success: false };
}

/**
 * Calls the Go sidecar via Tauri invoke and returns validated data via Zod schema.
 */
export const invokeSidecar = async <T>(
  command: string,
  schema: ZodSchema<T>,
  args?: Record<string, unknown>,
): Promise<T> => {
  sidecarLogger.debug(`invokeSidecar: ${command}`, args);

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const raw: unknown = await invoke("sidecar_command", {
      command,
      args: args ?? {},
    });

    const result = schema.safeParse(raw);
    if (!result.success) {
      sidecarLogger.error(`Schema validation failed for ${command}`, result);
      throw {
        code: "SCHEMA_VALIDATION_ERROR",
        message: `Invalid response from sidecar command "${command}"`,
        details: raw,
      } satisfies AppError;
    }
    return result.data;
  } catch (err) {
    const appErr = normalizeError(err);
    sidecarLogger.error(`Sidecar command "${command}" failed`, appErr);
    throw appErr;
  }
};

/**
 * Raw invoke — returns unknown, caller must validate.
 */
export const invokeRaw = async (
  command: string,
  args?: Record<string, unknown>,
): Promise<unknown> => {
  sidecarLogger.debug(`invokeRaw: ${command}`, args);

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke("sidecar_command", { command, args: args ?? {} });
  } catch (err) {
    const appErr = normalizeError(err);
    sidecarLogger.error(`Sidecar command "${command}" failed`, appErr);
    throw appErr;
  }
};

/**
 * Executes a shell script via the sidecar.
 */
export const execScript = async (script: string): Promise<void> => {
  sidecarLogger.debug(`execScript: ${script}`);
  await invokeRaw("exec_script", { script });
};

/**
 * Reloads the quickshell daemon.
 */
export const reloadQuickshell = async (): Promise<void> => {
  sidecarLogger.info("Reloading quickshell");
  await execScript("qs ipc call settings reload");
};
