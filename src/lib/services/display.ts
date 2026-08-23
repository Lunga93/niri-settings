import { invokeRaw } from "../ipc";
import { sidecarLogger } from "../logger";
import type { DisplayLayoutConfig } from "../schemas";

export const listDisplayOutputs = async (): Promise<unknown> => {
  sidecarLogger.info("Querying display outputs");
  try {
    return await invokeRaw("list_outputs");
  } catch (err) {
    sidecarLogger.error("Failed to list outputs", err);
    return null;
  }
};

export const applyDisplayLayout = async (displays: DisplayLayoutConfig[]): Promise<boolean> => {
  sidecarLogger.info("Applying display layout", displays);
  try {
    await invokeRaw("apply_display_layout", { displays });
    return true;
  } catch (err) {
    sidecarLogger.error("Failed to apply display layout", err);
    return false;
  }
};
