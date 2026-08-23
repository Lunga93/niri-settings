import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger, sidecarLogger, schemaLogger } from "../logger";

describe("logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "debug").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logger has all log methods", () => {
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("sidecarLogger has all log methods", () => {
    expect(typeof sidecarLogger.debug).toBe("function");
    expect(typeof sidecarLogger.info).toBe("function");
    expect(typeof sidecarLogger.warn).toBe("function");
    expect(typeof sidecarLogger.error).toBe("function");
  });

  it("schemaLogger has all log methods", () => {
    expect(typeof schemaLogger.debug).toBe("function");
    expect(typeof schemaLogger.info).toBe("function");
    expect(typeof schemaLogger.warn).toBe("function");
    expect(typeof schemaLogger.error).toBe("function");
  });

  it("logger.info calls console.info", () => {
    logger.info("test message");
    expect(console.info).toHaveBeenCalledOnce();
  });

  it("logger.error calls console.error", () => {
    logger.error("error message");
    expect(console.error).toHaveBeenCalledOnce();
  });

  it("logger.warn calls console.warn", () => {
    logger.warn("warn message");
    expect(console.warn).toHaveBeenCalledOnce();
  });
});
