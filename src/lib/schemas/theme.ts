import { z } from "zod";

export const PywalThemeSchema = z.object({
  wallpaper: z.string().default(""),
  alpha: z.string().default("100"),
  scheme: z.string().default("dark"),
  special: z
    .object({
      background: z.string().default("#12100e"),
      foreground: z.string().default("#dfe4e9"),
      cursor: z.string().default("#dfe4e9"),
    })
    .default({}),
  colors: z.record(z.string()).default({}),
  primary_accent: z.string().default("#0a84ff"),
  secondary_accent: z.string().default("#bf5af2"),
});

export type PywalTheme = z.infer<typeof PywalThemeSchema>;
