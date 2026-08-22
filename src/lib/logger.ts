/// <reference types="vite/client" />

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  timestamp: number;
  data?: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel = import.meta.env.DEV ? "debug" : "info";

const formatTimestamp = (ts: number): string => {
  return new Date(ts).toISOString().slice(11, 23);
};

const formatMessage = (entry: LogEntry): string => {
  const prefix = entry.context ? `[${entry.context}]` : "";
  return `${formatTimestamp(entry.timestamp)} ${entry.level.toUpperCase().padEnd(5)} ${prefix} ${entry.message}`;
};

const createLogger = (
  context: string,
): {
  debug: (msg: string, data?: unknown) => void;
  info: (msg: string, data?: unknown) => void;
  warn: (msg: string, data?: unknown) => void;
  error: (msg: string, data?: unknown) => void;
} => {
  const log = (level: LogLevel, message: string, data?: unknown): void => {
    if (LOG_LEVELS[level] < LOG_LEVELS[MIN_LEVEL]) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: Date.now(),
      data,
    };

    const formatted = formatMessage(entry);

    switch (level) {
      case "debug":
        console.debug(formatted, data ?? "");
        break;
      case "info":
        console.info(formatted, data ?? "");
        break;
      case "warn":
        console.warn(formatted, data ?? "");
        break;
      case "error":
        console.error(formatted, data ?? "");
        break;
    }
  };

  return {
    debug: (msg: string, data?: unknown): void => log("debug", msg, data),
    info: (msg: string, data?: unknown): void => log("info", msg, data),
    warn: (msg: string, data?: unknown): void => log("warn", msg, data),
    error: (msg: string, data?: unknown): void => log("error", msg, data),
  };
};

export type Logger = ReturnType<typeof createLogger>;

export const logger: Logger = createLogger("app");
export const sidecarLogger: Logger = createLogger("sidecar");
export const schemaLogger: Logger = createLogger("schema");
