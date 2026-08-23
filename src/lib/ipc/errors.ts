import { AppErrorSchema, type AppError } from "../schemas";

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
