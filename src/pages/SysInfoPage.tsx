import React, { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { motion } from "framer-motion";
import {
  Layers,
  Cpu,
  Monitor,
  HardDrive,
  Terminal,
  Sparkles,
  Wand2,
  Check,
  CircleAlert,
  Loader2,
} from "lucide-react";
import SettingsGroup from "@/components/settings/SettingsGroup";
import SettingsRow from "@/components/settings/SettingsRow";
import { capabilitiesAtom, loadCapabilitiesAtom } from "@/stores";
import { installHelperScripts } from "@/lib/services";
import { type HelperScriptResult } from "@/lib/schemas";

type HelperKey = "apply_theme" | "apply_display_scale" | "night_light";

const HELPER_KEYS: readonly HelperKey[] = ["apply_theme", "apply_display_scale", "night_light"];

const HELPER_LABELS: Record<HelperKey, string> = {
  apply_theme: "Theme pipeline",
  apply_display_scale: "Display scaling",
  night_light: "Night light",
};

const SetupSection = (): React.JSX.Element => {
  const caps = useAtomValue(capabilitiesAtom);
  const reloadCaps = useSetAtom(loadCapabilitiesAtom);
  const [installing, setInstalling] = useState(false);
  const [results, setResults] = useState<HelperScriptResult[]>([]);

  const missing = HELPER_KEYS.filter((key) => !caps[key]);

  const handleInstall = async (): Promise<void> => {
    setInstalling(true);
    try {
      const result = await installHelperScripts();
      if (result) {
        setResults(result.results);
        await reloadCaps();
      }
    } finally {
      setInstalling(false);
    }
  };

  return (
    <SettingsGroup header="Tier 1 — Appearance Helpers" accent="#30d158">
      <div className="p-4 flex flex-col gap-3">
        <p className="text-[12px] leading-relaxed text-text-body">
          Helper scripts power theming, display scaling, and night light on bare setups. One click
          installs them into your local bin directory — no terminal work, no environment variables.
          Existing custom versions are never overwritten.
        </p>

        <div className="flex flex-col gap-2">
          {HELPER_KEYS.map((key) => {
            const present = Boolean(caps[key]);
            return (
              <div key={key} className="flex items-center gap-2.5 text-[12px]">
                {present ? (
                  <Check size={14} className="text-success shrink-0" />
                ) : (
                  <CircleAlert size={14} className="text-warn shrink-0" />
                )}
                <span className={present ? "text-text-header" : "text-text-subtitle"}>
                  {HELPER_LABELS[key]}
                </span>
                {!present && <span className="text-[11px] text-text-muted ml-auto">not found</span>}
              </div>
            );
          })}
        </div>

        {missing.length > 0 && (
          <button
            onClick={(): void => {
              void handleInstall();
            }}
            disabled={installing}
            className="self-start flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[11px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50 cursor-pointer"
            style={{ background: "var(--gradient-accent)", boxShadow: "var(--shadow-glow)" }}
          >
            {installing ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
            Install helper scripts
          </button>
        )}

        {results.length > 0 && (
          <ul className="text-[11px] text-text-subtitle flex flex-col gap-1">
            {results.map((r) => (
              <li key={r.script} className="flex items-center gap-1.5">
                <Check size={11} className="text-success shrink-0" />
                <span className="font-mono">{r.script}</span>
                <span>
                  {r.status === "kept"
                    ? "— kept your existing version"
                    : r.status === "updated"
                      ? "— updated"
                      : "— installed"}
                </span>
              </li>
            ))}
          </ul>
        )}

        {!caps.pywal_cache && (
          <div className="rounded-xl border border-border bg-surface-elevated/60 p-3">
            <p className="text-[11px] leading-relaxed text-text-subtitle">
              Optional: install pywal and wlsunset so wallpapers recolor your apps and night light
              actually shifts color temperature:
            </p>
            <code className="block mt-1.5 text-[11px] text-text-body font-mono select-all">
              sudo pacman -S --needed pywal wlsunset
            </code>
          </div>
        )}
      </div>
    </SettingsGroup>
  );
};

const INFO_GROUPS = [
  {
    title: "Environment & Compositor",
    accent: "var(--color-accent)",
    items: [
      { label: "Compositor", value: "Niri Scrollable Tiling WM", icon: Layers },
      { label: "Desktop Shell", value: "Quickshell Qt6 / QML", icon: Sparkles },
      { label: "Display Protocol", value: "Wayland Native", icon: Monitor },
    ],
  },
  {
    title: "Operating System & Core",
    accent: "#bf5af2",
    items: [
      { label: "Distribution", value: "CachyOS / Arch Linux", icon: HardDrive },
      { label: "Kernel", value: "Linux 6.x (CachyOS BORE)", icon: Terminal },
      { label: "Settings Frontend", value: "Tauri v2 + React 19", icon: Cpu },
    ],
  },
];

const SysInfoPage = (): React.JSX.Element => (
  <div className="h-full overflow-y-auto scrollbar-thin">
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="px-7 pt-6 pb-2">
        <h1 className="text-[24px] font-bold text-text-header tracking-tight">System Info</h1>
        <p className="text-[12px] text-text-subtitle mt-0.5">
          Operating system details, window manager, and shell runtime environment.
        </p>
      </div>

      <div className="flex flex-col gap-6 p-7">
        <SetupSection />

        {INFO_GROUPS.map((group) => (
          <SettingsGroup key={group.title} header={group.title} accent={group.accent}>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <SettingsRow key={item.label} title={item.label}>
                  <div className="flex items-center gap-2">
                    <Icon size={14} className="text-accent" />
                    <span className="text-[12px] font-semibold text-text-header">{item.value}</span>
                  </div>
                </SettingsRow>
              );
            })}
          </SettingsGroup>
        ))}

        <div className="rounded-2xl border border-border bg-surface-elevated/50 p-4 text-center">
          <p className="text-[11px] text-text-muted">
            Niri Settings Control Center • Powered by Pywal Theme Engine & WirePlumber
          </p>
        </div>
      </div>
    </motion.div>
  </div>
);

export default SysInfoPage;
