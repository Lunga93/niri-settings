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

  if (typeof err === "string") {
    return {
      code: "IPC_ERROR",
      message: err,
    };
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
  safeParse: (data: unknown) => { success: true; data: T } | { success: false; error?: unknown };
}

/**
 * Calls the Go sidecar via Tauri invoke and returns validated data via Zod schema.
 */
export const invokeSidecar = async <T>(
  command: string,
  schema: ZodSchema<T>,
  args?: Record<string, unknown>,
): Promise<T> => {
  const start = performance.now();
  sidecarLogger.debug(`[IPC] → invokeSidecar: ${command}`, args);

  let raw: unknown;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    raw = await invoke("sidecar_command", {
      command,
      args: args ?? {},
    });
  } catch (err) {
    const elapsed = (performance.now() - start).toFixed(1);
    const appErr = normalizeError(err);
    sidecarLogger.error(`[IPC] ✖ invokeSidecar "${command}" failed (${elapsed}ms)`, appErr);
    throw appErr;
  }

  const result = schema.safeParse(raw);
  const elapsed = (performance.now() - start).toFixed(1);
  if (!result.success) {
    sidecarLogger.error(
      `[IPC] ✖ Schema validation failed for "${command}" (${elapsed}ms)`,
      result.error ?? raw,
    );
    throw {
      code: "SCHEMA_VALIDATION_ERROR",
      message: `Invalid response from sidecar command "${command}"`,
      details: raw,
    } satisfies AppError;
  }

  sidecarLogger.debug(`[IPC] ✓ invokeSidecar: ${command} (${elapsed}ms)`);
  return result.data;
};

/**
 * Raw invoke — returns unknown, caller must validate.
 */
export const invokeRaw = async (
  command: string,
  args?: Record<string, unknown>,
): Promise<unknown> => {
  const start = performance.now();
  sidecarLogger.debug(`[IPC] → invokeRaw: ${command}`, args);

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke("sidecar_command", { command, args: args ?? {} });
    const elapsed = (performance.now() - start).toFixed(1);
    sidecarLogger.debug(`[IPC] ✓ invokeRaw: ${command} (${elapsed}ms)`);
    return result;
  } catch (err) {
    const elapsed = (performance.now() - start).toFixed(1);
    const appErr = normalizeError(err);
    sidecarLogger.error(`[IPC] ✖ invokeRaw "${command}" failed (${elapsed}ms)`, appErr);
    throw appErr;
  }
};

/**
 * Executes a shell script via the sidecar.
 */
export const execScript = async (script: string): Promise<void> => {
  const start = performance.now();
  sidecarLogger.debug(`[SCRIPT] → execScript: ${script}`);
  try {
    await invokeRaw("exec_script", { script });
    const elapsed = (performance.now() - start).toFixed(1);
    sidecarLogger.debug(`[SCRIPT] ✓ execScript finished (${elapsed}ms): ${script}`);
  } catch (err) {
    const elapsed = (performance.now() - start).toFixed(1);
    sidecarLogger.error(`[SCRIPT] ✖ execScript failed (${elapsed}ms): ${script}`, err);
    throw err;
  }
};

/**
 * Reloads the quickshell daemon.
 */
export const reloadQuickshell = async (): Promise<void> => {
  sidecarLogger.info("Reloading quickshell");
  await execScript("qs ipc call settings reload");
};
