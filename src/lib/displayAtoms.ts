import { atom } from "jotai";
import { z } from "zod";
import { DisplayOutputSchema, type DisplayOutput } from "@/lib/schemas";
import { listDisplayOutputs, getFocusedOutput } from "@/lib/services";
import { logger } from "@/lib/logger";

export const displayOutputsAtom = atom<DisplayOutput[]>([]);
export const displayOutputsLoadingAtom = atom<boolean>(false);
export const displayOutputsErrorAtom = atom<string | null>(null);

export const refreshDisplayOutputsAtom = atom(null, async (_get, set) => {
  set(displayOutputsLoadingAtom, true);
  set(displayOutputsErrorAtom, null);
  try {
    const [rawOutputs, focusedName] = await Promise.all([listDisplayOutputs(), getFocusedOutput()]);

    const result = z.array(DisplayOutputSchema).safeParse(rawOutputs);
    if (result.success) {
      // Mark the focused output
      const outputs = result.data.map((o) => ({
        ...o,
        focused: focusedName !== null && o.name.includes(focusedName),
      }));
      set(displayOutputsAtom, outputs);
    } else {
      set(displayOutputsErrorAtom, "Failed to parse display outputs");
      logger.warn("Display outputs parse failed", result.error.flatten());
    }
  } catch (err) {
    logger.error("Failed to fetch display outputs", err);
    set(displayOutputsErrorAtom, err instanceof Error ? err.message : "Unknown error");
  } finally {
    set(displayOutputsLoadingAtom, false);
  }
});
