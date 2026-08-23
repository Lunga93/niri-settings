import { z } from "zod";

export const KeybindingSchema = z.object({
  action: z.string(),
  key: z.string(),
});

export type Keybinding = z.infer<typeof KeybindingSchema>;
