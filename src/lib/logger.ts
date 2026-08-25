/// <reference types="vite/client" />

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
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

const MIN_LEVEL: LogLevel = import.meta.env?.DEV ? "debug" : "info";

const MAX_LOG_HISTORY = 500;
const logHistory: LogEntry[] = [];

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
  time: <T>(label: string, fn: () => Promise<T>) => Promise<T>;
} => {
  const log = (level: LogLevel, message: string, data?: unknown): void => {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: Date.now(),
      data,
    };

    logHistory.push(entry);
    if (logHistory.length > MAX_LOG_HISTORY) {
      logHistory.shift();
    }

    if (LOG_LEVELS[level] < LOG_LEVELS[MIN_LEVEL]) {
      return;
    }

    const formatted = formatMessage(entry);

    switch (level) {
      case "debug":
        if (data !== undefined) {
          console.debug(formatted, data);
        } else {
          console.debug(formatted);
        }
        break;
      case "info":
        if (data !== undefined) {
          console.info(formatted, data);
        } else {
          console.info(formatted);
        }
        break;
      case "warn":
        if (data !== undefined) {
          console.warn(formatted, data);
        } else {
          console.warn(formatted);
        }
        break;
      case "error":
        if (data !== undefined) {
          console.error(formatted, data);
        } else {
          console.error(formatted);
        }
        break;
    }
  };

  const time = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    log("debug", `→ ${label} started`);
    try {
      const result = await fn();
      const elapsed = (performance.now() - start).toFixed(1);
      log("debug", `✓ ${label} completed in ${elapsed}ms`);
      return result;
    } catch (err) {
      const elapsed = (performance.now() - start).toFixed(1);
      log("error", `✖ ${label} failed after ${elapsed}ms`, err);
      throw err;
    }
  };

  return {
    debug: (msg: string, data?: unknown): void => log("debug", msg, data),
    info: (msg: string, data?: unknown): void => log("info", msg, data),
    warn: (msg: string, data?: unknown): void => log("warn", msg, data),
    error: (msg: string, data?: unknown): void => log("error", msg, data),
    time,
  };
};

export type Logger = ReturnType<typeof createLogger>;

export const logger: Logger = createLogger("app");
export const sidecarLogger: Logger = createLogger("sidecar");
export const schemaLogger: Logger = createLogger("schema");
