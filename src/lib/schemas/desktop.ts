import { z } from "zod";

export const DesktopThemeSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const DesktopThemesSchema = z.object({
  icon_themes: z.array(DesktopThemeSchema),
  cursor_themes: z.array(DesktopThemeSchema),
});

export type DesktopTheme = z.infer<typeof DesktopThemeSchema>;
export type DesktopThemes = z.infer<typeof DesktopThemesSchema>;
