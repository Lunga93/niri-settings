import { z } from "zod";

// Mirrors the sidecar's get_capabilities probe: which optional host
// integrations exist on the current machine.
export const CapabilitiesSchema = z.object({
  niri: z.boolean(),
  gsettings: z.boolean(),
  wpctl: z.boolean(),
  quickshell: z.boolean(),
  apply_theme: z.boolean(),
  apply_display_scale: z.boolean(),
  night_light: z.boolean(),
  pywal_cache: z.boolean(),
});

export type Capabilities = z.infer<typeof CapabilitiesSchema>;

export const CAPABILITIES_FALLBACK: Capabilities = {
  niri: false,
  gsettings: false,
  wpctl: false,
  quickshell: false,
  apply_theme: false,
  apply_display_scale: false,
  night_light: false,
  pywal_cache: false,
};

// Live host network snapshot from the sidecar (nmcli + ip).
export const NetworkInterfaceSchema = z.object({
  name: z.string(),
  kind: z.enum(["ethernet", "wifi", "other"]),
  connected: z.boolean(),
  state: z.string(),
  ips: z.array(z.string()),
});

export const NetworkStatusSchema = z.object({
  nm_available: z.boolean(),
  interfaces: z.array(NetworkInterfaceSchema),
});

export type NetworkInterface = z.infer<typeof NetworkInterfaceSchema>;
export type NetworkStatus = z.infer<typeof NetworkStatusSchema>;
