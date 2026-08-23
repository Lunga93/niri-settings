import React from "react";
import { motion } from "framer-motion";
import { Layers, Cpu, Monitor, HardDrive, Terminal, Sparkles } from "lucide-react";
import SettingsGroup from "@/components/settings/SettingsGroup";
import SettingsRow from "@/components/settings/SettingsRow";

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
