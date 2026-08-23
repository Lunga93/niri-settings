import { atom } from "jotai";
import { z } from "zod";
import { DisplayOutputSchema, type DisplayOutput, type DisplayLayoutConfig } from "@/lib/schemas";
import { listDisplayOutputs, getFocusedOutput, applyDisplayLayout } from "@/lib/services";
import { logger } from "@/lib/logger";

export const displayOutputsAtom = atom<DisplayOutput[]>([]);
export const displayOutputsLoadingAtom = atom<boolean>(false);
export const displayOutputsErrorAtom = atom<string | null>(null);
export const selectedOutputNameAtom = atom<string | null>(null);
export const displaySavingAtom = atom<boolean>(false);

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
        focused:
          focusedName !== null &&
          (o.name.includes(focusedName) || o.connector.includes(focusedName)),
      }));
      set(displayOutputsAtom, outputs);

      // Auto-select first output if none selected
      const currentSelected = _get(selectedOutputNameAtom);
      if (!currentSelected && outputs.length > 0) {
        set(selectedOutputNameAtom, outputs[0].name);
      }
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

/**
 * Updates an output's position (x, y) in the local atom state.
 */
export const updateOutputPositionAtom = atom(
  null,
  (get, set, { name, x, y }: { name: string; x: number; y: number }) => {
    const outputs = get(displayOutputsAtom);
    const updated = outputs.map((o) => (o.name === name ? { ...o, x, y } : o));
    set(displayOutputsAtom, updated);
  },
);

/**
 * Updates an output's rotation/transform in the local atom state.
 */
export const updateOutputTransformAtom = atom(
  null,
  (get, set, { name, transform }: { name: string; transform: string }) => {
    const outputs = get(displayOutputsAtom);
    const updated = outputs.map((o) => (o.name === name ? { ...o, transform } : o));
    set(displayOutputsAtom, updated);
  },
);

/**
 * Updates an output's scale in the local atom state.
 */
export const updateOutputScaleAtom = atom(
  null,
  (get, set, { name, scale }: { name: string; scale: number }) => {
    const outputs = get(displayOutputsAtom);
    const updated = outputs.map((o) => (o.name === name ? { ...o, scale } : o));
    set(displayOutputsAtom, updated);
  },
);

/**
 * Saves and applies display positions and transformations to niri and wlr-randr.
 */
export const saveDisplayLayoutAtom = atom(null, async (get, set) => {
  set(displaySavingAtom, true);
  try {
    const outputs = get(displayOutputsAtom);
    const layouts: DisplayLayoutConfig[] = outputs.map((o) => ({
      name: o.name,
      full_name: o.full_name || o.name,
      connector: o.connector || o.name,
      x: o.x,
      y: o.y,
      transform: o.transform || "normal",
      scale: o.scale || 1.0,
      mode: o.modes && o.modes.length > 0 ? o.modes[0] : "",
    }));

    await applyDisplayLayout(layouts);
    logger.info("Display layout applied successfully");
  } catch (err) {
    logger.error("Failed to apply display layout", err);
  } finally {
    set(displaySavingAtom, false);
  }
});
